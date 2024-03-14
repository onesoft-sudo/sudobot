/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { VerificationEntry } from "@prisma/client";
import bcrypt from "bcrypt";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    Guild,
    GuildMember,
    PartialGuildMember,
    escapeMarkdown,
    time
} from "discord.js";
import jwt from "jsonwebtoken";
import { logError } from "../components/log/Logger";
import Service from "../core/Service";
import { HasEventListeners } from "../types/HasEventListeners";
import { userInfo } from "../utils/embed";
import { safeChannelFetch, safeMemberFetch } from "../utils/fetch";

export const name = "verification";

export default class VerificationService extends Service implements HasEventListeners {
    // FIXME: do not create doubled entries if the user leaves and rejoins
    async onGuildMemberAdd(member: GuildMember) {
        if (member.user.bot) {
            return;
        }

        const config = this.client.configManager.config[member.guild.id]?.verification;

        if (!config?.enabled || !this.requiresVerification(member)) {
            return;
        }

        if (config.unverified_roles.length > 0) {
            await member.roles.add(config.unverified_roles);
        }

        const { token } = await this.createDatabaseEntry(member);

        try {
            await this.sendVerificationDMToMember(member, token);
        } catch (error) {
            logError(error);

            await this.sendLog(member.guild, {
                author: {
                    name: member.user.username,
                    icon_url: member.user.displayAvatarURL()
                },
                title: "Failed to send verification DM",
                color: Colors.Red,
                description:
                    "This user will not be able to verify and will remain unverified unless an admin manually verifies them.",
                fields: [
                    {
                        name: "User",
                        value: userInfo(member.user)
                    }
                ],
                footer: {
                    text: "Failed"
                },
                timestamp: new Date().toISOString()
            });

            return;
        }

        await this.sendLog(member.guild, {
            author: {
                name: member.user.username,
                icon_url: member.user.displayAvatarURL()
            },
            title: "Verification Initiated",
            color: Colors.Gold,
            fields: [
                {
                    name: "User",
                    value: userInfo(member.user)
                }
            ],
            footer: {
                text: "Initiated"
            },
            timestamp: new Date().toISOString()
        });
    }

    async onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
        await this.client.prisma.verificationEntry.deleteMany({
            where: {
                userId: member.user.id,
                guildId: member.guild.id
            }
        });
    }

    async onMemberVerificationFail(
        member: GuildMember,
        { attempts, guildId }: VerificationEntry,
        remainingTime: number
    ) {
        const config = this.client.configManager.config[guildId]?.verification;

        if (!config) {
            return;
        }

        if ((config.max_attempts === 0 || attempts < config.max_attempts) && remainingTime > 0) {
            return;
        }

        switch (config.action_on_fail?.type) {
            case "ban":
                if (member.bannable) {
                    await this.client.infractionManager.createUserBan(member.user, {
                        guild: member.guild,
                        moderator: this.client.user!,
                        autoRemoveQueue: true,
                        notifyUser: true,
                        sendLog: true,
                        reason: "Failed verification"
                    });
                }

                break;

            case "kick":
                if (member.kickable) {
                    await this.client.infractionManager.createMemberKick(member, {
                        guild: member.guild,
                        moderator: this.client.user!,
                        notifyUser: true,
                        sendLog: true,
                        reason: "Failed verification"
                    });
                }

                break;

            case "mute":
                if (member.manageable || member.moderatable) {
                    await this.client.infractionManager.createMemberMute(member, {
                        guild: member.guild,
                        moderator: this.client.user!,
                        notifyUser: true,
                        sendLog: true,
                        reason: "Failed verification",
                        autoRemoveQueue: true
                    });
                }

                break;

            case "role":
                if (member.manageable) {
                    const methodName = config.action_on_fail!.mode === "give" ? "add" : "remove";
                    await member.roles[methodName](config.action_on_fail!.roles).catch(logError);
                }

                break;
        }
    }

    requiresVerification(member: GuildMember) {
        const config = this.client.configManager.config[member.guild.id]?.verification;

        return (
            config?.parameters?.always ||
            (typeof config?.parameters?.age_less_than === "number" &&
                Date.now() - member.user.createdAt.getTime() < config?.parameters?.age_less_than) ||
            (config?.parameters?.no_avatar && member.user.avatar === null)
        );
    }

    async createDatabaseEntry(member: GuildMember) {
        const config = this.client.configManager.config[member.guild.id]?.verification;

        const seed = await bcrypt.hash(
            (Math.random() * 100000000).toString(),
            await bcrypt.genSalt()
        );
        const token = jwt.sign(
            {
                seed,
                userId: member.user.id
            },
            process.env.JWT_SECRET!,
            {
                expiresIn: config?.max_time === 0 ? undefined : config?.max_time,
                issuer: "SudoBot",
                subject: "Verification Token"
            }
        );

        return this.client.prisma.verificationEntry.create({
            data: {
                userId: member.user.id,
                token,
                guildId: member.guild.id
            }
        });
    }

    async sendLog(guild: Guild, embed: APIEmbed) {
        const config = this.client.configManager.config[guild.id]?.verification;

        if (!config?.logging.enabled) {
            return;
        }

        const channelId =
            config.logging.channel ??
            this.client.configManager.config[guild.id]?.logging?.primary_channel;

        if (!channelId) {
            return;
        }

        const channel = await safeChannelFetch(guild, channelId);

        if (!channel || !channel.isTextBased()) {
            return;
        }

        return channel
            .send({
                embeds: [embed]
            })
            .catch(logError);
    }

    sendVerificationDMToMember(member: GuildMember, token: string) {
        const url = `${process.env.FRONTEND_URL}/challenge/verify?t=${encodeURIComponent(
            token
        )}&u=${member.id}&g=${member.guild.id}&n=${encodeURIComponent(member.guild.name)}`;

        return member.send({
            embeds: [
                {
                    author: {
                        icon_url: member.guild.iconURL() ?? undefined,
                        name: "Verification Required"
                    },
                    color: Colors.Gold,
                    description: `
                        Hello **${escapeMarkdown(member.user.username)}**,\n
                        [${member.guild.name}](https://discord.com/channels/${
                        member.guild.id
                    }) requires you to verify to continue. Click on the button below to complete verification. Alternatively, you can copy-paste this link into your browser:\n
                        ${url}\n
                        You might be asked to solve a captcha.\n
                        Sincerely,
                        **The Staff of ${member.guild.name}**
                    `.replace(/(\r\n|\n)\t+/, "\n"),
                    footer: {
                        text: `You have ${formatDistanceToNowStrict(
                            Date.now() -
                                (this.client.configManager.config[member.guild.id]?.verification
                                    ?.max_time ?? 0)
                        )} to verify`
                    },
                    timestamp: new Date().toISOString()
                }
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel("Verify")
                )
            ]
        });
    }

    async sendVerificationSuccessDMToMember(member: GuildMember) {
        return member.send({
            embeds: [
                {
                    author: {
                        icon_url: member.guild.iconURL() ?? undefined,
                        name: "Verification Completed"
                    },
                    color: Colors.Green,
                    description: `
                        Hello **${escapeMarkdown(member.user.username)}**,
                        You have successfully verified yourself. You've been granted access to the server now.\n
                        Cheers,
                        **The Staff of ${member.guild.name}**
                    `.replace(/(\r\n|\n)\t+/, "\n"),
                    footer: {
                        text: "Completed"
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        });
    }

    async attemptToVerifyUserByToken(userId: string, token: string, method: string) {
        const entry = await this.client.prisma.verificationEntry.findFirst({
            where: {
                userId,
                token
            }
        });

        if (!entry) {
            return null;
        }

        const config = this.client.configManager.config[entry.guildId]?.verification;
        const guild = this.client.guilds.cache.get(entry.guildId);

        if (!guild || !config) {
            return null;
        }

        const member = await safeMemberFetch(guild, entry.userId);

        if (!member) {
            return null;
        }

        let userIdFromPayload: string | undefined;

        try {
            let { payload } = jwt.verify(entry.token, process.env.JWT_SECRET!, {
                complete: true,
                issuer: "SudoBot",
                subject: "Verification Token"
            });

            if (typeof payload === "string") {
                payload = JSON.parse(payload);
            }

            userIdFromPayload = (payload as { [key: string]: string }).userId;
        } catch (error) {
            logError(error);
        }

        const maxAttemptsExcceded =
            typeof config?.max_attempts === "number" &&
            config?.max_attempts > 0 &&
            entry.attempts > config?.max_attempts;

        if (entry.token !== token || userIdFromPayload !== userId || maxAttemptsExcceded) {
            const remainingTime =
                config.max_time === 0
                    ? Number.POSITIVE_INFINITY
                    : Math.max(entry.createdAt.getTime() + config.max_time - Date.now(), 0);

            await this.sendLog(guild, {
                author: {
                    name: member?.user.username ?? "Unknown",
                    icon_url: member?.user.displayAvatarURL()
                },
                title: "Failed Verification Attempt",
                color: Colors.Red,
                fields: [
                    {
                        name: "User",
                        value: member ? userInfo(member.user) : entry.userId
                    },
                    {
                        name: "Attempts",
                        value: `${maxAttemptsExcceded ? "More than " : ""}${entry.attempts} times ${
                            typeof config?.max_attempts === "number" && config?.max_attempts > 0
                                ? `(${config?.max_attempts} max)`
                                : ""
                        }`
                    },
                    {
                        name: "Verification Initiated At",
                        value: `${time(entry.createdAt, "R")} (${
                            remainingTime === 0
                                ? "Session expired"
                                : Number.isFinite(remainingTime)
                                ? `${formatDistanceToNowStrict(
                                      new Date(Date.now() - remainingTime)
                                  )} remaining`
                                : "Session never expires"
                        })`
                    },
                    {
                        name: "Method",
                        value: method
                    }
                ],
                footer: {
                    text: "Failed"
                },
                timestamp: new Date().toISOString()
            });

            if (!maxAttemptsExcceded) {
                await this.client.prisma.verificationEntry.update({
                    where: {
                        id: entry.id
                    },
                    data: {
                        attempts: {
                            increment: 1
                        }
                    }
                });
            }

            await this.onMemberVerificationFail(member, entry, remainingTime);
            return null;
        }

        if (member) {
            await this.sendVerificationSuccessDMToMember(member).catch(logError);
        }

        await this.sendLog(guild, {
            author: {
                name: member?.user.username ?? "Unknown",
                icon_url: member?.user.displayAvatarURL()
            },
            title: "Successfully Verified Member",
            color: Colors.Green,
            fields: [
                {
                    name: "User",
                    value: member ? userInfo(member.user) : entry.userId
                },
                {
                    name: "Method",
                    value: method
                }
            ],
            footer: {
                text: "Verified"
            },
            timestamp: new Date().toISOString()
        });

        await this.onMemberVerify(member).catch(logError);

        await this.client.prisma.verificationEntry.delete({
            where: {
                id: entry.id
            }
        });

        return {
            id: entry.userId,
            token
        };
    }

    async onMemberVerify(member: GuildMember) {
        const config = this.client.configManager.config[member.guild.id]?.verification;

        if (config?.unverified_roles?.length) {
            await member.roles.remove(config?.unverified_roles);
        }

        if (config?.verified_roles?.length) {
            await member.roles.add(config?.verified_roles);
        }
    }
}
