/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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
import { env } from "@main/env/env";
import { verificationEntries } from "@main/models/VerificationEntry";
import { VerificationMethod, verificationRecords } from "@main/models/VerificationRecord";
import VerificationExpiredQueue from "@main/queues/VerificationExpiredQueue";
import type ConfigurationManager from "@main/services/ConfigurationManager";
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
import { and, eq, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

@Name("verificationService")
class VerificationService extends Service {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("moderationActionService")
    private readonly moderationActionService!: ModerationActionService;

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

        if (interaction.user.id !== memberId) {
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

        if (config.method !== "channel_interaction") {
            return void (await interaction.reply({
                content: "This server does not have this verification method enabled.",
                ephemeral: true
            }));
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

        if (!entry) {
            return void (await interaction.editReply({
                content: "This verification session has expired."
            }));
        }

        const url = this.getVerificationURL(interaction.guildId, interaction.user.id, entry.token);

        await interaction.editReply({
            content: `Please click the button below. Alternatively, you can verify yourself by copy-pasting the following link in your browser.\n${url}`,
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
        return env.FRONTEND_GUILD_MEMBER_VERIFICATION_URL ?? env.FRONTEND_URL;
    }

    private getVerificationURL(guildId: string, memberId: string, token: string) {
        const domain = this.getVerificationDomain();
        return `${domain}${domain === env.FRONTEND_URL ? "/verify" : ""}/guilds/${encodeURIComponent(guildId)}/challenge/onboarding?t=${encodeURIComponent(token)}&u=${encodeURIComponent(memberId)}`;
    }

    public async startVerification(member: GuildMember, reason: string) {
        const config = this.configFor(member.guild.id);

        if (!config || !member.manageable) {
            return;
        }

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

        switch (config.method) {
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

    private async checkProxy(ip: string) {
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

    public async attemptVerification(guildId: string, memberId: string, ip: string, token: string) {
        const proxyCheck = await this.checkProxy(ip);
        let error: string | undefined;
        const config = this.configFor(guildId);

        if (!config?.enabled) {
            return { error: "This server does not have verification enabled." };
        }

        verify: {
            if (proxyCheck) {
                error =
                    "You seem to be using a VPN or proxy. Please disable it, reload this page and try again.";
                break verify;
            }

            const entry = await this.application.database.query.verificationEntries.findFirst({
                where(fields, operators) {
                    return operators.and(
                        operators.eq(fields.userId, memberId),
                        operators.eq(fields.guildId, guildId),
                        operators.eq(fields.token, token)
                    );
                }
            });

            if (!entry) {
                return { error: "We're unable to verify you." };
            }

            await this.application.database.drizzle
                .delete(verificationEntries)
                .where(eq(verificationEntries.id, entry.id))
                .execute();

            await this.application.database.drizzle
                .insert(verificationRecords)
                .values({
                    userId: memberId,
                    method: entry.method,
                    guildId
                })
                .execute();

            await this.clearVerificationQueues(guildId, memberId);

            const guild = this.application.client.guilds.cache.get(guildId);

            if (!guild) {
                return { success: true };
            }

            const member = await fetchMember(guild, memberId);

            if (!member) {
                return { success: true };
            }

            await member.roles
                .add(config.verified_roles, "User has been verified.")
                .catch(this.logger.error);
            await member.roles
                .remove(config.unverified_roles, "User has been verified.")
                .catch(this.logger.error);
            return { success: true };
        }

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
