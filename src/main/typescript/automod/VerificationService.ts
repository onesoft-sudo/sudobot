import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { Events } from "@framework/types/ClientEvents";
import { fetchMember, fetchUser } from "@framework/utils/entities";
import { Colors } from "@main/constants/Colors";
import { env } from "@main/env/env";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type ModerationActionService from "@main/services/ModerationActionService";
import { VerificationEntry, VerificationMethod } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    Snowflake,
    bold
} from "discord.js";
import jwt from "jsonwebtoken";

// TODO

@Name("verificationService")
class VerificationService extends Service {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("moderationActionService")
    private readonly moderationActionService!: ModerationActionService;

    private configFor(guildId: Snowflake) {
        return this.configManager.config[guildId]?.member_verification;
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
        await this.application.prisma.verificationEntry.deleteMany({
            where: {
                userId: member.id,
                guildId: member.guild.id
            }
        });
    }

    public async startVerification(member: GuildMember, reason?: string) {
        const config = this.configFor(member.guild.id);

        if (!config?.enabled) {
            return;
        }

        if (config.unverified_roles.length > 0) {
            await member.roles.add(config.unverified_roles, reason);
        }

        const code = jwt.sign(
            {
                memberId: member.id,
                guildId: member.guild.id
            },
            env.JWT_SECRET,
            {
                expiresIn: config.max_duration ?? "1d",
                issuer: env.JWT_ISSUER,
                subject: "Member Verification"
            }
        );

        const entry = await this.application.prisma.verificationEntry.create({
            data: {
                guildId: member.guild.id,
                userId: member.id,
                code,
                expiresAt: new Date(Date.now() + (config.max_duration ?? 24 * 60 * 60) * 1000)
            }
        });

        await this.sendVerificationMessage(member, entry.code).catch(this.application.logger.error);
    }

    private async sendVerificationMessage(member: GuildMember, code: string) {
        const config = this.configFor(member.guild.id);

        if (!config?.enabled || !env.SYSTEM_API_URL) {
            return;
        }

        await member.send({
            embeds: [
                {
                    author: {
                        name: "Verification Required",
                        icon_url: member.guild.iconURL() ?? undefined
                    },
                    description:
                        config.verification_message ??
                        `Welcome to ${bold(member.guild.name)}! Please verify your account to gain access to the server.`,
                    color: Colors.Primary,
                    footer: {
                        text: "This message was sent to you because you joined a server that requires account verification."
                    },
                    timestamp: new Date().toISOString()
                }
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel("Verify")
                        .setStyle(ButtonStyle.Link)
                        .setURL(
                            `${env.FRONTEND_URL}/guilds/${encodeURIComponent(member.guild.id)}/verify?token=${encodeURIComponent(code)}`
                        )
                )
            ]
        });
    }

    public async getVerificationEntry(code: string) {
        const entry = await this.application.prisma.verificationEntry.findUnique({
            where: {
                code
            }
        });

        if (!entry) {
            return null;
        }

        if (entry.expiresAt.getTime() < Date.now()) {
            await this.application.prisma.verificationEntry.delete({
                where: {
                    id: entry.id
                }
            });

            const actions = this.configFor(entry.guildId)?.expired_actions;
            const guild = this.application.client.guilds.cache.get(entry.guildId);

            if (actions?.length && guild) {
                const memberOrUser =
                    (await fetchMember(guild, entry.userId)) ??
                    (await fetchUser(this.application.client, entry.userId));

                if (memberOrUser) {
                    await this.moderationActionService.takeActions(guild, memberOrUser, actions);
                }
            }

            return null;
        }

        return entry;
    }

    public async verifyByCode(code: string, payload: VerificationPayload) {
        const entry = await this.getVerificationEntry(code);

        if (!entry) {
            return null;
        }

        return this.verifyWithEntry(entry, payload);
    }

    public async verifyWithEntry(entry: VerificationEntry, payload: VerificationPayload) {
        const config = this.configFor(entry.guildId);

        if (!config?.enabled) {
            return null;
        }

        const guild = this.application.client.guilds.cache.get(entry.guildId);

        if (!guild) {
            return null;
        }

        if (payload.method === VerificationMethod.EMAIL) {
            if (
                typeof entry.metadata !== "object" ||
                !entry.metadata ||
                !("email" in entry.metadata) ||
                !("emailToken" in entry.metadata) ||
                entry.metadata.email !== payload.email ||
                entry.metadata.emailToken !== payload.emailToken
            ) {
                return {
                    error: "invalid_email"
                };
            }

            if (payload.emailToken) {
                delete payload.emailToken;
            }
        }

        const existingRecord = await this.application.prisma.verificationRecord.findFirst({
            where: {
                guildId: guild.id,
                userId: entry.userId,
                ...(payload as {
                    email?: string;
                })
            }
        });

        if (existingRecord) {
            return {
                error: "record_exists"
            };
        }

        const member = await fetchMember(guild, entry.userId);

        if (!member) {
            return null;
        }

        if (config.unverified_roles.length > 0) {
            await member.roles.remove(config.unverified_roles, "Account verified.");
        }

        if (config.verified_roles.length > 0) {
            await member.roles.add(config.verified_roles, "Account verified.");
        }

        await this.application.prisma.verificationEntry.delete({
            where: {
                id: entry.id
            }
        });

        await this.application.prisma.verificationRecord.create({
            data: {
                guildId: guild.id,
                userId: member.id,
                ...payload
            }
        });

        await member
            .send({
                embeds: [
                    {
                        author: {
                            name: "Verification Complete",
                            icon_url: member.guild.iconURL() ?? undefined
                        },
                        description:
                            config.success_message ??
                            `You have successfully verified your account in ${bold(member.guild.name)}!`,
                        color: Colors.Green,
                        footer: {
                            text: "This message was sent to you because you verified your account in a server."
                        },
                        timestamp: new Date().toISOString()
                    }
                ]
            })
            .catch(this.application.logger.error);

        return {
            guildId: guild.id,
            userId: member.id
        };
    }

    public async generateEmailToken(entry: VerificationEntry, email: string) {
        const config = this.configFor(entry.guildId);

        if (!config?.enabled) {
            return null;
        }

        const token = jwt.sign(
            {
                guildId: entry.guildId,
                userId: entry.userId,
                email
            },
            env.JWT_SECRET,
            {
                expiresIn: "6h",
                issuer: env.JWT_ISSUER
            }
        );

        await this.application.prisma.verificationEntry.update({
            where: {
                id: entry.id
            },
            data: {
                metadata: {
                    emailToken: token,
                    email
                }
            }
        });

        return token;
    }
}

export type VerificationPayload = {
    githubId?: string;
    googleId?: string;
    discordId?: string;
    email?: string;
    emailToken?: string;
    method: VerificationMethod;
};

export default VerificationService;
