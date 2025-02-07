/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { Events } from "@framework/types/ClientEvents";
import { BUG } from "@framework/utils/devflow";
import { fetchChannel, fetchMember, fetchUser } from "@framework/utils/entities";
import { Colors } from "@main/constants/Colors";
import { getEnvData } from "@main/env/env";
import {
    AltFingerprintCreatePayload,
    altFingerprints,
    AltFingerprintType
} from "@main/models/AltFingerprint";
import { verificationEntries, VerificationStatus } from "@main/models/VerificationEntry";
import { VerificationMethod, verificationRecords } from "@main/models/VerificationRecord";
import VerificationExpiredQueue from "@main/queues/VerificationExpiredQueue";
import { LogEventType } from "@main/schemas/LoggingSchema";
import AuditLoggingService from "@main/services/AuditLoggingService";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type DirectiveParsingService from "@main/services/DirectiveParsingService";
import type ModerationActionService from "@main/services/ModerationActionService";
import { getAxiosClient } from "@main/utils/axios";
import { formatDistanceToNowStrict } from "date-fns";
import {
    ActionRowBuilder,
    APIEmbed,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    Interaction,
    Snowflake
} from "discord.js";
import { and, eq, gt, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import undici from "undici";

@Name("verificationService")
class VerificationService extends Service {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("moderationActionService")
    private readonly moderationActionService!: ModerationActionService;

    @Inject("directiveParsingService")
    private readonly directiveParsingService!: DirectiveParsingService;

    @Inject("auditLoggingService")
    private readonly auditLoggingService!: AuditLoggingService;

    private configFor(guildId: Snowflake) {
        return this.configManager.config[guildId]?.member_verification;
    }

    public async onInteractionCreate(interaction: Interaction) {
        if (
            !interaction.isButton() ||
            !interaction.inGuild() ||
            !interaction.customId.startsWith("verify_")
        ) {
            return;
        }

        const memberId = interaction.customId.split("_")[1];

        if (memberId !== "static" && interaction.user.id !== memberId) {
            return void (await interaction.reply({
                content: "This button is not under your control.",
                ephemeral: true
            }));
        }

        const config = this.configFor(interaction.guildId);

        if (!config?.enabled) {
            return void (await interaction.reply({
                content: "This server does not have verification enabled.",
                ephemeral: true
            }));
        }

        if (
            (memberId !== "static" && config.method !== "channel_interaction") ||
            (memberId === "static" && config.method !== "channel_static_interaction")
        ) {
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const entry = await this.application.database.query.verificationEntries.findFirst({
            where(fields, operators) {
                return operators.and(
                    operators.eq(fields.userId, interaction.user.id),
                    operators.eq(fields.guildId, interaction.guildId)
                );
            }
        });

        if (memberId === "static") {
            const url = entry
                ? this.getVerificationURL(interaction.guildId, interaction.user.id, entry.token)
                : await this.startVerification(
                      interaction.member as GuildMember,
                      "Verification requested by user.",
                      true
                  );

            if (!url) {
                return void (await interaction.editReply({
                    content: "Failed to start verification."
                }));
            }

            await interaction.editReply({
                content: `Hi **${interaction.user.username}**! Please click the button below. Alternatively, you can verify yourself by copy-pasting the following link in your browser.\n${url}`,
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Verify")
                            .setURL(url)
                    )
                ]
            });

            return;
        }

        if (!entry) {
            return void (await interaction.editReply({
                content: "This verification session has expired."
            }));
        }

        const url = this.getVerificationURL(interaction.guildId, interaction.user.id, entry.token);

        await interaction.editReply({
            content: `Hi **${interaction.user.username}**! Please click the button below. Alternatively, you can verify yourself by copy-pasting the following link in your browser.\n${url}`,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Verify").setURL(url)
                )
            ]
        });
    }

    @GatewayEventListener(Events.GuildMemberAdd)
    public async onGuildMemberAdd(member: GuildMember) {
        const config = this.configFor(member.guild.id);

        if (!config?.enabled || !member.manageable) {
            return;
        }

        const { age_less_than, always, no_avatar } = config.conditions;

        if (!always && age_less_than && member.user.createdTimestamp > Date.now() - age_less_than) {
            return this.startVerification(member, "Account is too young.");
        }

        if (!always && no_avatar && !member.user.avatar) {
            return this.startVerification(member, "Account has no avatar.");
        }

        if (always) {
            return this.startVerification(member, "Account requires verification.");
        }
    }

    @GatewayEventListener(Events.GuildMemberRemove)
    public async onGuildMemberRemove(member: GuildMember) {
        await this.application.database.drizzle
            .delete(verificationEntries)
            .where(
                and(
                    eq(verificationEntries.userId, member.id),
                    eq(verificationEntries.guildId, member.guild.id)
                )
            );

        await this.clearVerificationQueues(member.guild.id, member.id);
    }

    private getVerificationDomain() {
        return getEnvData().FRONTEND_GUILD_MEMBER_VERIFICATION_URL ?? getEnvData().FRONTEND_URL;
    }

    private getVerificationURL(guildId: string, memberId: string, token: string) {
        const domain = this.getVerificationDomain();
        return `${domain}${domain === getEnvData().FRONTEND_URL ? "/verify" : ""}/guilds/${encodeURIComponent(guildId)}/challenge/onboarding?t=${encodeURIComponent(token)}&u=${encodeURIComponent(memberId)}`;
    }

    public async startVerification(member: GuildMember, reason: string, silent = false) {
        const config = this.configFor(member.guild.id);

        if (!config || !member.manageable) {
            return;
        }

        const env = getEnvData();

        await member.roles.add(config.unverified_roles, reason).catch(this.logger.error);
        await member.roles.remove(config.verified_roles, reason).catch(this.logger.error);

        const options = {
            expiresIn: config.max_duration,
            issuer: env.JWT_ISSUER
        };

        if (!options.expiresIn) {
            delete options.expiresIn;
        }

        const token = jwt.sign(
            { id: member.id, guildId: member.guild.id },
            env.JWT_SECRET,
            options
        );

        await this.application.database.drizzle
            .insert(verificationEntries)
            .values({
                guildId: member.guild.id,
                userId: member.id,
                token,
                method: config.method as VerificationMethod,
                expiresAt: config.max_duration
                    ? new Date(Date.now() + config.max_duration * 1000)
                    : null
            })
            .execute();

        const url = this.getVerificationURL(member.guild.id, member.id, token);

        if (silent) {
            return url;
        }

        switch (config.method) {
            case "channel_static_interaction":
                if (!config.channel) {
                    break;
                }

                if (!config.message_id_internal) {
                    try {
                        const channel = await fetchChannel(member.guild, config.channel);

                        if (!channel?.isTextBased()) {
                            break;
                        }

                        const { data, output } = await this.directiveParsingService.parse(
                            config.verification_message ??
                                "Welcome to the server! Please verify yourself by clicking the button below."
                        );
                        const options = {
                            content: output.trim() === "" ? undefined : output,
                            embeds: (data.embeds as APIEmbed[]) ?? [],
                            allowedMentions: { parse: [], roles: [], users: [] },
                            components: [
                                new ActionRowBuilder<ButtonBuilder>().addComponents(
                                    new ButtonBuilder()
                                        .setStyle(ButtonStyle.Secondary)
                                        .setLabel("Start Verification")
                                        .setCustomId("verify_static")
                                )
                            ]
                        };

                        const { id } = await channel.send(options);

                        if (this.configManager.config[member.guild.id]?.member_verification) {
                            this.configManager.config[
                                member.guild.id
                            ]!.member_verification!.message_id_internal = id;
                            await this.configManager.write();
                        }
                    } catch (error) {
                        this.logger.error(
                            "Failed to send verification message to channel: ",
                            error
                        );
                    }
                }

                break;

            case "channel_interaction":
                if (!config.channel) {
                    break;
                }

                try {
                    const channel = await fetchChannel(member.guild, config.channel);

                    if (!channel?.isTextBased()) {
                        break;
                    }

                    await channel.send({
                        content: `Welcome <@${member.user.id}>, this server requires you to verify before you can interact with others. Please verify yourself by clicking button below.`,
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().addComponents(
                                new ButtonBuilder()
                                    .setStyle(ButtonStyle.Secondary)
                                    .setLabel("Start Verification")
                                    .setCustomId(`verify_${member.id}`)
                            )
                        ]
                    });
                } catch (error) {
                    this.logger.error("Failed to send verification message to channel: ", error);
                }

                break;

            case "dm_interaction":
                {
                    const embed: APIEmbed = {
                        author: {
                            name: "Verification Required",
                            icon_url: member.guild.iconURL() ?? undefined
                        },
                        color: Colors.Primary,
                        footer: config.max_duration
                            ? {
                                  text: `Expires in ${formatDistanceToNowStrict(new Date(Date.now() - config.max_duration * 1000))}`
                              }
                            : undefined,
                        description:
                            config.verification_message ??
                            `Hello **${member.user.username}**,\n\n**${member.guild.name}** requires new members to verify themselves before they can interact with others. Please verify yourself by clicking the button below.\n\nAlternatively, you can verify yourself copy-pasting the following link in your browser: ${url}\n\nSincerely,\n*The Staff of ${member.guild.name}*`
                    };

                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setURL(url)
                            .setLabel("Verify")
                    );

                    try {
                        await member.send({ embeds: [embed], components: [row] });
                    } catch (error) {
                        this.logger.error("Failed to send verification message to user: ", error);
                    }
                }

                break;

            default:
                BUG("Unknown verification method");
        }

        if (config.max_duration) {
            await this.application
                .service("queueService")
                .create(VerificationExpiredQueue, {
                    guildId: member.guild.id,
                    data: { memberId: member.id, guildId: member.guild.id },
                    runsAt: new Date(Date.now() + config.max_duration * 1000)
                })
                .schedule();
        }

        return url;
    }

    public async onVerificationExpire(guildId: Snowflake, memberId: Snowflake) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const config = this.configFor(guildId);

        if (!config) {
            return;
        }

        const target =
            (await fetchMember(guild, memberId)) ??
            (await fetchUser(this.application.client, memberId));

        if (!target) {
            return;
        }

        await this.moderationActionService.takeActions(guild, target, config.expired_actions);
    }

    public async clearVerificationQueues(guildId: Snowflake, memberId: Snowflake) {
        await this.application
            .service("queueService")
            .bulkCancel(VerificationExpiredQueue, queue => {
                return queue.data.memberId === memberId && queue.data.guildId === guildId;
            });
    }

    public async isProxy(ip: string) {
        const env = getEnvData();
        const response = await getAxiosClient().get(
            `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&asn=1` +
                (env.PROXYCHECKIO_API_KEY
                    ? `&key=${encodeURIComponent(env.PROXYCHECKIO_API_KEY)}`
                    : "")
        );

        this.logger.debug(ip, response.data);

        if (response.data.status !== "ok" || !response.data[ip]) {
            return true;
        }

        return (
            response.data[ip].proxy === "yes" ||
            response.data[ip].tor === "yes" ||
            response.data[ip].vpn === "yes" ||
            response.data[ip].type === "VPN" ||
            response.data[ip].type === "Tor"
        );
    }

    public async connectDiscord(
        guildId: string,
        memberId: string,
        token: string,
        discordCode: string
    ) {
        try {
            const body = new URLSearchParams({
                client_id: getEnvData().CLIENT_ID,
                client_secret: getEnvData().CLIENT_SECRET,
                code: discordCode,
                grant_type: "authorization_code",
                redirect_uri: `${getEnvData().FRONTEND_GUILD_MEMBER_VERIFICATION_URL}/next/discord`,
                scope: "identify guilds",
                state: `${guildId}|${memberId}|${token}`
            }).toString();

            const tokenResponse = await undici.request("https://discord.com/api/oauth2/token", {
                method: "POST",
                body,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            if (tokenResponse.statusCode > 299 || tokenResponse.statusCode < 200) {
                throw new Error(`Failed to communicate with Discord: ${tokenResponse.statusCode}`);
            }

            const oauthData = await tokenResponse.body.json();

            if (typeof oauthData !== "object" || !oauthData) {
                throw new Error("Invalid response from Discord");
            }

            const { access_token, token_type } = oauthData as Record<string, string>;
            const userResponse = await undici.request("https://discord.com/api/users/@me", {
                method: "GET",
                headers: {
                    Authorization: `${token_type} ${access_token}`
                }
            });

            if (userResponse.statusCode > 299 || userResponse.statusCode < 200) {
                throw new Error(`Failed to get user info: ${userResponse.statusCode}`);
            }

            const userData = (await userResponse.body.json()) as Record<string, string>;

            if (typeof userData !== "object" || !userData) {
                throw new Error("Invalid user response");
            }

            if (userData.error) {
                throw new Error(userData.error);
            }

            const discordId = userData.id;

            if (discordId !== memberId) {
                throw new Error("Discord ID mismatch");
            }

            const result = await this.application.database.drizzle
                .update(verificationEntries)
                .set({ status: VerificationStatus.DiscordAuthorized })
                .where(
                    and(
                        eq(verificationEntries.userId, memberId),
                        eq(verificationEntries.guildId, guildId),
                        eq(verificationEntries.token, token),
                        gt(verificationEntries.expiresAt, new Date())
                    )
                )
                .execute();

            if (result.rowCount === 0) {
                throw new Error("Invalid verification payload/session.");
            }

            return {
                success: true
            };
        } catch (error) {
            this.logger.error("Failed to connect Discord account: ", error);

            return {
                error:
                    error instanceof Error ? error?.message : "Failed to connect Discord account."
            };
        }
    }

    public async attemptVerification(
        guildId: string,
        memberId: string,
        ip: string,
        token: string,
        fingerprints: Record<AltFingerprintType, string>
    ) {
        const proxyCheck = await this.isProxy(ip);
        const config = this.configFor(guildId);
        let error: string | undefined;
        let reason: string | undefined;

        if (!config?.enabled) {
            return { error: "This server does not have verification enabled." };
        }

        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return { error: "This server cannot use the verification system." };
        }

        const member = await fetchMember(guild, memberId);

        if (!member) {
            return { error: "Could not find the member." };
        }

        let altUserIds: string[] | undefined;
        let incomplete = false;

        verify: {
            // if (proxyCheck) {
            //     error =
            //         "You seem to be using a VPN or proxy. Please disable it, reload this page and try again.";
            //     reason = "VPN or Proxy detected.";
            //     break verify;
            // }

            const entry = await this.application.database.query.verificationEntries.findFirst({
                where(fields, operators) {
                    return operators.and(
                        operators.eq(fields.userId, memberId),
                        operators.eq(fields.guildId, guildId),
                        operators.eq(fields.token, token),
                        operators.eq(fields.status, VerificationStatus.DiscordAuthorized)
                    );
                }
            });

            if (!entry) {
                return { error: "We're unable to verify you." };
            }

            if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) {
                error = "Verification session has expired.";
                reason = "Verification session expired.";
                break verify;
            }

            fpCheck: if (config?.alt_detection?.enabled) {
                const fingerprintsArray = Object.entries(fingerprints).map(
                    ([type, fingerprint]) => ({
                        type: +type,
                        fingerprint
                    })
                );

                if (fingerprintsArray.length <= 4) {
                    incomplete = true;
                    break fpCheck;
                }

                const { rows } = await this.application.database.pool.query<{
                    user_id: string;
                    match_count: number;
                }>(
                    `
                        WITH given_fingerprints AS (
                            SELECT unnest($1::integer[]) AS type,
                                unnest($2::text[]) AS fingerprint
                        ),
                        matching_users AS (
                            SELECT af.user_id, COUNT(*) AS match_count
                            FROM alt_fingerprints af
                            JOIN given_fingerprints gf 
                            ON af.type = gf.type AND af.fingerprint = gf.fingerprint
                            WHERE af.user_id != $3::text
                            GROUP BY af.user_id
                        ),
                        max_count AS (
                            SELECT MAX(match_count) AS max_match
                            FROM matching_users
                        )
                        SELECT mu.user_id, mu.match_count::integer
                        FROM matching_users mu
                        JOIN max_count mc
                        ON mu.match_count = mc.max_match;
                    `,
                    [
                        fingerprintsArray.map(({ type }) => type),
                        fingerprintsArray.map(({ fingerprint }) => fingerprint),
                        memberId
                    ]
                );
                const altFingerprintEntries = rows
                    .filter(row => row.match_count >= 7)
                    .sort((a, b) => b.match_count - a.match_count);

                this.logger.debug("Result: ", rows, altFingerprintEntries);
                this.logger.debug("FP: ", fingerprints);

                if (altFingerprintEntries && altFingerprintEntries.length > 0) {
                    altUserIds = altFingerprintEntries.map(entry => entry.user_id);

                    if (config?.alt_detection?.actions?.moderationActions) {
                        this.moderationActionService
                            .takeActions(
                                guild,
                                member,
                                config?.alt_detection?.actions?.moderationActions
                            )
                            .catch(this.logger.error);
                    }

                    if (
                        config?.alt_detection?.actions?.failVerification ||
                        config?.alt_detection?.actions?.moderationActions
                    ) {
                        error = "We couldn't verify you.";
                        reason = "Alt account detected.";
                        break verify;
                    }
                }
            }

            await this.application.database.drizzle
                .delete(verificationEntries)
                .where(eq(verificationEntries.id, entry.id))
                .execute();

            this.application.database.drizzle
                .insert(verificationRecords)
                .values({
                    userId: memberId,
                    method: entry.method,
                    guildId
                })
                .execute()
                .catch(this.logger.error);

            const fingerprintRecords: AltFingerprintCreatePayload[] = [];

            for (const [type, fingerprint] of Object.entries(fingerprints)) {
                fingerprintRecords.push({
                    userId: memberId,
                    fingerprint,
                    type: +type
                });
            }

            this.application.database.drizzle
                .insert(altFingerprints)
                .values(fingerprintRecords)
                .onConflictDoNothing()
                .execute()
                .catch(this.logger.error);

            await this.clearVerificationQueues(guildId, memberId);

            await member.roles
                .add(config.verified_roles, "User has been verified.")
                .catch(this.logger.error);
            await member.roles
                .remove(config.unverified_roles, "User has been verified.")
                .catch(this.logger.error);

            this.auditLoggingService
                .emitLogEvent(guildId, LogEventType.GuildVerificationSuccess, {
                    member,
                    altAccountIds: altUserIds,
                    ip,
                    incomplete
                })
                .catch(this.logger.error);

            return { success: true };
        }

        this.auditLoggingService
            .emitLogEvent(guildId, LogEventType.GuildVerificationAttempt, {
                member,
                reason,
                altAccountIds: altUserIds,
                ip,
                incomplete
            })
            .catch(this.logger.error);

        await this.application.database.drizzle
            .update(verificationEntries)
            .set({ attempts: sql`${verificationEntries.attempts} + 1` })
            .where(
                and(
                    eq(verificationEntries.userId, memberId),
                    eq(verificationEntries.guildId, guildId),
                    eq(verificationEntries.token, token)
                )
            );

        return { error };
    }
}

export default VerificationService;
