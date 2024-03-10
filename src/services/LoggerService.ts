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

import { Infraction } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbedField,
    ActionRowBuilder,
    AttachmentBuilder,
    BanOptions,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Collection,
    ColorResolvable,
    Colors,
    EmbedBuilder,
    EmbedData,
    Guild,
    GuildChannel,
    GuildMember,
    Message,
    MessageCreateOptions,
    MessagePayload,
    MessageResolvable,
    MessageType,
    NonThreadGuildBasedChannel,
    Role,
    TextChannel,
    User,
    VoiceBasedChannel,
    VoiceChannel,
    VoiceState,
    escapeMarkdown,
    roleMention,
    time
} from "discord.js";
import Service from "../core/Service";
import { MessageRuleType } from "../types/MessageRuleSchema";
import { NotUndefined } from "../types/NotUndefined";
import { log, logError } from "../utils/Logger";
import { userInfo } from "../utils/embed";
import { isTextableChannel } from "../utils/utils";
import { GuildConfig } from "./ConfigManager";

export const name = "loggerService";

type LoggingChannelType = Exclude<keyof NotUndefined<GuildConfig["logging"]>, "enabled">;

export default class LoggerService extends Service {
    private async send(
        guild: Guild,
        options: string | MessagePayload | MessageCreateOptions,
        channel?: LoggingChannelType
    ) {
        const channelId =
            this.client.configManager.config[guild.id]?.logging?.[channel ?? "primary_channel"] ??
            this.client.configManager.config[guild.id]?.logging?.primary_channel;
        const enabled = this.client.configManager.config[guild.id]?.logging?.enabled;

        if (!enabled || !channelId) return null;

        try {
            const channel = await guild.channels.fetch(channelId as string);

            if (!channel || !isTextableChannel(channel)) return null;

            return await channel.send(options);
        } catch (e) {
            logError(e);
            return null;
        }
    }

    private createLogEmbed({
        options,
        title,
        user,
        fields,
        footerText,
        timestamp,
        moderator,
        reason,
        id,
        color,
        showUserId = true
    }: CreateLogEmbedOptions) {
        const embed = new EmbedBuilder({
            title,
            author: user
                ? {
                      name: user.tag,
                      iconURL: user.displayAvatarURL()
                  }
                : undefined,
            fields: [
                ...(reason !== undefined
                    ? [
                          {
                              name: "Reason",
                              value: `${reason ?? "*No reason provided*"}`
                          }
                      ]
                    : []),
                ...(fields ?? []),
                ...(moderator
                    ? [
                          {
                              name: "Responsible Moderator",
                              value:
                                  moderator.id === this.client.user?.id
                                      ? "System"
                                      : `${moderator.tag} (${moderator.id})`
                          }
                      ]
                    : []),
                ...(id
                    ? [
                          {
                              name: "Infraction ID",
                              value: `${id}`
                          }
                      ]
                    : []),
                ...(user && showUserId
                    ? [
                          {
                              name: "User ID",
                              value: user.id
                          }
                      ]
                    : [])
            ],
            footer: footerText
                ? {
                      text: footerText
                  }
                : undefined,
            ...options
        });

        if (timestamp === undefined) embed.setTimestamp();
        else if (timestamp) embed.setTimestamp(timestamp);

        if (color) embed.setColor(color);

        return embed;
    }

    private async sendLogEmbed(
        guild: Guild,
        options: CreateLogEmbedOptions,
        extraOptions?: MessagePayload | MessageCreateOptions,
        channel?: LoggingChannelType
    ) {
        return await this.send(
            guild,
            {
                ...(extraOptions ?? {}),
                embeds: [
                    this.createLogEmbed(options),
                    ...(extraOptions && "embeds" in extraOptions ? extraOptions.embeds ?? [] : [])
                ]
            } as unknown as MessageCreateOptions | MessagePayload,
            channel
        );
    }

    /*
     * Logging methods.
     */

    async logAIAutoModMessageDelete({
        message,
        toxicityScore,
        severeToxicityScore,
        threatScore,
        isToxic,
        isThreat,
        isSeverelyToxic,
        isExplicit,
        isFlirty,
        isAttack,
        isInsult,
        isProfanity,
        explicitScore,
        flirtationScore,
        identityAttackScore,
        insultScore,
        profanityScore
    }: {
        message: Message;
        toxicityScore: number;
        severeToxicityScore: number;
        threatScore: number;
        explicitScore: number;
        flirtationScore: number;
        identityAttackScore: number;
        insultScore: number;
        profanityScore: number;
        isToxic?: boolean;
        isThreat?: boolean;
        isSeverelyToxic?: boolean;
        isExplicit?: boolean;
        isFlirty?: boolean;
        isAttack?: boolean;
        isInsult?: boolean;
        isProfanity?: boolean;
    }) {
        const {
            max_severe_toxicity,
            max_threat,
            max_toxicity,
            max_explicit,
            max_flirtation,
            max_identity_attack,
            max_insult,
            max_profanity
        } = this.client.configManager.config[message.guildId!]?.ai_automod?.parameters ?? {
            max_severe_toxicity: 100,
            max_threat: 100,
            max_toxicity: 100,
            max_explicit: 100,
            max_flirtation: 100,
            max_identity_attack: 100,
            max_insult: 100,
            max_profanity: 100
        };

        const threat = isThreat === undefined ? threatScore >= max_threat : isThreat;
        const toxic = isToxic === undefined ? toxicityScore >= max_toxicity : isToxic;
        const severeToxic =
            isSeverelyToxic === undefined
                ? severeToxicityScore >= max_severe_toxicity
                : isSeverelyToxic;

        const explicit = isExplicit ?? explicitScore >= max_explicit;
        const flirty = isFlirty ?? flirtationScore >= max_flirtation;
        const attack = isAttack ?? identityAttackScore >= max_identity_attack;
        const insult = isInsult ?? insultScore >= max_insult;
        const profanity = isProfanity ?? profanityScore >= max_profanity;

        let messageType: string = "removed for unknown reason";

        if (threat) {
            messageType = "threatening";
        } else if (toxic) {
            messageType = "toxic";
        } else if (severeToxic) {
            messageType = "severly toxic";
        } else if (explicit) {
            messageType = "sexually explicit";
        } else if (flirty) {
            messageType = "flirty";
        } else if (attack) {
            messageType = "attacking";
        } else if (insult) {
            messageType = "insulting";
        } else if (profanity) {
            messageType = "flagged for profanity";
        }

        await this.sendLogEmbed(message.guild!, {
            title: "AI AutoMod has flagged this message",
            color: Colors.Red,
            user: message.author,
            fields: [
                {
                    name: "Score",
                    value: `Toxicity: ${toxicityScore.toFixed(2)}%\nThreat: ${threatScore.toFixed(
                        2
                    )}%\nSevere Toxicity: ${severeToxicityScore.toFixed(
                        2
                    )}%\nNSFW: ${explicitScore.toFixed(2)}%\nFlirtation: ${flirtationScore.toFixed(
                        2
                    )}%\nIdentity Attack: ${identityAttackScore.toFixed(
                        2
                    )}%\nInsult: ${insultScore.toFixed(2)}%\nProfanity: ${profanityScore.toFixed(
                        2
                    )}%`
                },
                {
                    name: "Reason",
                    value: messageType ? `This message seems to be ${messageType}.` : "Unknown"
                }
            ],
            footerText: "Flagged",
            moderator: this.client.user!
        });
    }

    async logInfractionCreate(infraction: Infraction, user: User, moderator: User) {
        await this.sendLogEmbed(
            this.client.guilds.cache.get(infraction.guildId)!,
            {
                title: "Infraction Created",
                color: Colors.Red,
                user,
                fields: [
                    {
                        name: "Type",
                        value: this.client.infractionManager.typeToString(infraction.type)
                    },
                    ...(infraction.expiresAt
                        ? [
                              {
                                  name: "Expiry",
                                  value: `${time(infraction.expiresAt, "R")}`
                              }
                          ]
                        : [])
                ],
                reason: infraction.reason,
                id: infraction.id.toString(),
                moderator,
                footerText: "Created"
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logVoiceChannelStateUpdate(
        user: User,
        oldChannel?: VoiceBasedChannel | null,
        newChannel?: VoiceBasedChannel | null
    ) {
        if (newChannel?.id === oldChannel?.id) {
            return;
        }

        if (oldChannel) {
            await this.sendLogEmbed(oldChannel.guild, {
                title: "Member left voice channel",
                color: Colors.Red,
                user,
                fields: [
                    {
                        name: "Channel",
                        value: oldChannel.toString()
                    }
                ],
                footerText: "Left"
            });
        } else if (newChannel) {
            await this.sendLogEmbed(newChannel.guild, {
                title: "Member joined voice channel",
                color: Colors.Green,
                user,
                fields: [
                    {
                        name: "Channel",
                        value: newChannel.toString()
                    }
                ],
                footerText: "Joined"
            });
        }
    }

    async logMemberDisconnect({
        user,
        guild,
        moderator,
        reason,
        channel
    }: {
        reason?: string;
        user: User;
        guild: Guild;
        moderator?: User;
        channel: VoiceChannel;
    }) {
        await this.sendLogEmbed(guild, {
            title: "Member disconnected",
            color: Colors.Red,
            user,
            reason,
            footerText: "Disconnected",
            moderator,
            fields: [
                {
                    name: "Channel",
                    value: channel?.toString() ?? "None"
                },

                {
                    name: "User",
                    value: userInfo(user)
                }
            ]
        });
    }

    async logMemberDeaf({
        user,
        guild,
        moderator,
        reason,
        channel
    }: {
        reason?: string;
        user: User;
        guild: Guild;
        moderator?: User;
        channel: VoiceChannel;
    }) {
        await this.sendLogEmbed(guild, {
            title: "Member deafened",
            color: Colors.Red,
            user,
            reason,
            footerText: "Deafened",
            moderator,
            fields: [
                {
                    name: "Channel",
                    value: channel?.toString() ?? "None"
                },

                {
                    name: "User",
                    value: userInfo(user)
                }
            ]
        });
    }

    async logMemberUndeaf({
        user,
        guild,
        moderator,
        reason,
        channel
    }: {
        reason?: string;
        user: User;
        guild: Guild;
        moderator?: User;
        channel: VoiceChannel;
    }) {
        await this.sendLogEmbed(guild, {
            title: "Member undeafened",
            color: Colors.Green,
            user,
            reason,
            footerText: "Undeafened",
            moderator,
            fields: [
                {
                    name: "Channel",
                    value: channel?.toString() ?? "None"
                },

                {
                    name: "User",
                    value: userInfo(user)
                }
            ]
        });
    }

    async logMemberVoiceMute({
        user,
        guild,
        moderator,
        reason,
        channel
    }: {
        reason?: string;
        user: User;
        guild: Guild;
        moderator?: User;
        channel: VoiceChannel;
    }) {
        await this.sendLogEmbed(guild, {
            title: "Member voice muted",
            color: Colors.Red,
            user,
            reason,
            footerText: "Voice Muted",
            moderator,
            fields: [
                {
                    name: "Channel",
                    value: channel?.toString() ?? "None"
                },

                {
                    name: "User",
                    value: userInfo(user)
                }
            ]
        });
    }

    async logMemberVoiceUnmute({
        user,
        guild,
        moderator,
        reason,
        channel
    }: {
        reason?: string;
        user: User;
        guild: Guild;
        moderator?: User;
        channel: VoiceChannel;
    }) {
        await this.sendLogEmbed(guild, {
            title: "Member unmuted",
            color: Colors.Green,
            user,
            reason,
            footerText: "Unmuted",
            moderator,
            fields: [
                {
                    name: "Channel",
                    value: channel?.toString() ?? "None"
                },

                {
                    name: "User",
                    value: userInfo(user)
                }
            ]
        });
    }

    async logMemberVoiceMove({
        user,
        guild,
        moderator,
        reason,
        newChannel,
        oldChannel
    }: {
        reason?: string;
        user: User;
        guild: Guild;
        moderator?: User;
        newChannel: VoiceState["channel"];
        oldChannel: VoiceState["channel"];
    }) {
        await this.sendLogEmbed(guild, {
            title: "Member moved to a new voice channel",
            color: Colors.Blurple,
            user,
            reason,
            footerText: "Moved",
            moderator,
            fields: [
                {
                    name: "From",
                    value: oldChannel?.toString() ?? "None",
                    inline: true
                },
                {
                    name: "To",
                    value: newChannel?.toString() ?? "None",
                    inline: true
                },
                {
                    name: "User",
                    value: userInfo(user)
                }
            ]
        });
    }

    async logMessageRuleAction({
        message,
        embedOptions = {},
        rule,
        actions
    }: {
        message: Message;
        actions: MessageRuleType["actions"];
        embedOptions?: CreateLogEmbedOptions;
        rule: MessageRuleType["type"];
    }) {
        log("Actions", actions);

        await this.sendLogEmbed(message.guild!, {
            color: Colors.Red,
            user: message.author,
            footerText: "AutoMod",
            moderator: this.client.user!,
            ...embedOptions,
            fields: [
                ...(embedOptions.fields ?? []),
                {
                    name: "Rule",
                    value: `\`${rule}\``,
                    inline: true
                },
                {
                    name: "Actions taken",
                    value: `\`${actions.length === 0 ? "none" : actions.join("`, `")}\``,
                    inline: true
                },
                {
                    name: "Message",
                    value: `${message.url}`
                }
            ]
        });
    }

    async logFileFilterDeletedMessage(
        message: Message,
        {
            contentType,
            hash,
            url
        }: { hash: string; url: string; name?: string; contentType?: string | null }
    ) {
        await this.sendLogEmbed(message.guild!, {
            title: "Blocked file detected",
            color: Colors.Red,
            user: message.author,
            fields: [
                {
                    name: "File",
                    value:
                        `${
                            name ? `[${escapeMarkdown(name)}](${url})` : `[Unnamed](${url})`
                        }: \`${hash}\`` + (contentType ? ` (\`${contentType}\`)` : "")
                }
            ],
            footerText: "Deleted",
            moderator: this.client.user!
        });
    }

    async logMemberTimeout(
        member: GuildMember,
        {
            reason,
            id,
            moderator
        }: Omit<CommonUserActionOptions, "guild" | "id"> & { reason?: string; id?: string | number }
    ) {
        await this.sendLogEmbed(
            member.guild,
            {
                title: "Member timed-out",
                color: Colors.Red,
                user: member.user,
                fields: [
                    {
                        name: "Duration",
                        value: formatDistanceToNowStrict(member.communicationDisabledUntil!)
                    },
                    {
                        name: "User Information",
                        value: `Username: ${
                            member.user.username
                        }\nMention: ${member.user.toString()}\nID: ${member.user.id}`
                    }
                ],
                footerText: "Timed-out",
                reason,
                id: id?.toString(),
                moderator
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logMemberTimeoutRemove(
        member: GuildMember,
        {
            reason,
            id,
            moderator
        }: Omit<CommonUserActionOptions, "guild" | "id"> & { reason?: string; id?: string | number }
    ) {
        await this.sendLogEmbed(
            member.guild,
            {
                title: "Member timeout removed",
                color: Colors.Green,
                user: member.user,
                fields: [
                    {
                        name: "User Information",
                        value: `Username: ${
                            member.user.username
                        }\nMention: ${member.user.toString()}\nID: ${member.user.id}`
                    }
                ],
                footerText: "Timed-out removed",
                reason,
                id: id?.toString(),
                moderator
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logChannelCreate(channel: NonThreadGuildBasedChannel) {
        await this.sendLogEmbed(channel.guild, {
            title: "Channel Created",
            color: Colors.Green,
            fields: [
                {
                    name: "Name",
                    value: channel.name
                },
                {
                    name: "ID",
                    value: channel.id
                },
                {
                    name: "Mention",
                    value: channel.toString()
                },
                {
                    name: "Type",
                    value: ChannelType[channel.type]
                }
            ],
            footerText: "Created"
        });
    }

    async logChannelDelete(channel: NonThreadGuildBasedChannel) {
        await this.sendLogEmbed(channel.guild, {
            title: "Channel Deleted",
            color: Colors.Red,
            fields: [
                {
                    name: "Name",
                    value: channel.name
                },
                {
                    name: "ID",
                    value: channel.id
                },
                {
                    name: "Type",
                    value: ChannelType[channel.type]
                }
            ],
            footerText: "Deleted"
        });
    }

    async logChannelUpdate(
        oldChannel: NonThreadGuildBasedChannel,
        newChannel: NonThreadGuildBasedChannel
    ) {
        await this.sendLogEmbed(newChannel.guild, {
            title: "Channel Updated",
            color: Colors.Green,
            fields: [
                {
                    name: "Old Name",
                    value: oldChannel.name,
                    inline: true
                },
                {
                    name: "New Name",
                    value: newChannel.name,
                    inline: true
                },
                {
                    name: "ID",
                    value: newChannel.id
                }
            ],
            footerText: "Updated"
        });
    }

    async logRoleCreate(role: Role) {
        const permissions = role.permissions.toArray();

        await this.sendLogEmbed(role.guild, {
            title: "Role Created",
            color: Colors.Green,
            fields: [
                {
                    name: "Name",
                    value: role.name
                },
                {
                    name: "ID",
                    value: role.id
                },
                {
                    name: "Mention",
                    value: role.toString()
                },
                {
                    name: "Icon",
                    value: role.icon ? role.iconURL()! : "*None*"
                },
                {
                    name: "Permissions",
                    value:
                        permissions.length === 0
                            ? "*Nothing*"
                            : "`" + permissions.join("`, `") + "`"
                }
            ],
            footerText: "Created"
        });
    }

    async logRoleDelete(role: Role) {
        const permissions = role.permissions.toArray();

        await this.sendLogEmbed(role.guild, {
            title: "Role Deleted",
            color: Colors.Red,
            fields: [
                {
                    name: "Name",
                    value: role.name
                },
                {
                    name: "ID",
                    value: role.id
                },
                {
                    name: "Icon",
                    value: role.icon ? role.iconURL()! : "*None*"
                },
                {
                    name: "Permissions",
                    value:
                        permissions.length === 0
                            ? "*Nothing*"
                            : "`" + permissions.join("`, `") + "`"
                }
            ],
            footerText: "Deleted"
        });
    }

    async logRoleUpdate(oldRole: Role, newRole: Role) {
        const newRolePermissions = newRole.permissions.toArray();
        const oldRolePermissions = oldRole.permissions.toArray();
        const addedPermissions = newRolePermissions.filter(
            permission => !oldRolePermissions.includes(permission)
        );
        const removedPermissions = oldRolePermissions.filter(
            permission => !newRolePermissions.includes(permission)
        );

        await this.sendLogEmbed(newRole.guild, {
            title: "Role Updated",
            color: Colors.Green,
            fields: [
                {
                    name: "Name",
                    value: `Old name: ${oldRole.name}\nNew name: ${newRole.name}`
                },
                {
                    name: "ID",
                    value: newRole.id
                },
                {
                    name: "Mention",
                    value: newRole.toString()
                },
                {
                    name: "Icon",
                    value: `Old icon: ${oldRole.icon ? oldRole.iconURL()! : "*None*"}\nNew icon: ${
                        newRole.icon ? newRole.iconURL()! : "*None*"
                    }`
                },
                {
                    name: "Added Permissions",
                    value:
                        addedPermissions.length === 0
                            ? "*Nothing*"
                            : "`" + addedPermissions.join("`, `") + "`",
                    inline: true
                },
                {
                    name: "Removed Permissions",
                    value:
                        removedPermissions.length === 0
                            ? "*Nothing*"
                            : "`" + removedPermissions.join("`, `") + "`",
                    inline: true
                }
            ],
            footerText: "Updated"
        });
    }

    async logNicknameUpdate(oldMember: GuildMember, newMember: GuildMember) {
        await this.sendLogEmbed(newMember.guild, {
            title: "Member nickname updated",
            user: newMember.user,
            color: 0x007bff,
            fields: [
                {
                    name: "Old Nickname",
                    value: oldMember.nickname ?? "*Nothing*",
                    inline: true
                },
                {
                    name: "New Nickname",
                    value: newMember.nickname ?? "*Nothing*",
                    inline: true
                },
                {
                    name: "User Information",
                    value: `Username: ${
                        newMember.user.username
                    }\nMention: ${newMember.user.toString()}\nID: ${newMember.user.id}`
                }
            ],
            footerText: "Updated"
        });
    }

    async logMemberRoleUpdate(oldMember: GuildMember, newMember: GuildMember) {
        const added = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removed = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

        await this.sendLogEmbed(
            newMember.guild,
            {
                title: "Member roles updated",
                user: newMember.user,
                color: Colors.Green,
                showUserId: false,
                fields: [
                    {
                        name: "Added",
                        value:
                            added.size === 0
                                ? "*Nothing added*"
                                : added.reduce((acc, role) => `${acc} ${role.toString()}`, "")
                    },
                    {
                        name: "Removed",
                        value:
                            removed.size === 0
                                ? "*Nothing removed*"
                                : removed.reduce((acc, role) => `${acc} ${role.toString()}`, "")
                    },
                    {
                        name: "User Information",
                        value: `Username: ${
                            newMember.user.username
                        }\nMention: ${newMember.user.toString()}\nID: ${newMember.user.id}`
                    }
                ],
                footerText: "Roles Updated"
            },
            {
                allowedMentions: {
                    roles: []
                }
            }
        );
    }

    async logGuildMemberAdd(member: GuildMember) {
        if (!this.client.configManager.config[member.guild.id]?.logging?.events.member_join) {
            return;
        }

        let members = 0,
            bots = 0;

        for (const m of member.guild.members.cache.values()) {
            if (m.user.bot) bots++;
            else members++;
        }

        const createdAt = Math.round((member.user.createdAt?.getTime() ?? Date.now()) / 1000);
        const inviteOrVanity = await this.client.inviteTracker.findNewMemberInviteLink(member);

        await this.sendLogEmbed(
            member.guild,
            {
                title: "New member joined",
                user: member.user,
                color: 0x007bff,
                options: {
                    description: `${member.user.toString()} just joined the server!`
                },
                fields: [
                    {
                        name: "New Account?",
                        value:
                            Date.now() - member.user.createdTimestamp < 3 * 24 * 60 * 60 * 1000
                                ? ":warning: Yes"
                                : "No",
                        inline: true
                    },
                    {
                        name: "Bot?",
                        value: member.user.bot ? "Yes" : "No",
                        inline: true
                    },
                    {
                        name: "Account Created At",
                        value: `<t:${createdAt}:f> (<t:${createdAt}:R>)`
                    },
                    {
                        name: "User Information",
                        value: `Username: ${
                            member.user.username
                        }\nMention: ${member.user.toString()}\nID: ${member.user.id}`,
                        inline: true
                    },
                    {
                        name: "Positions",
                        value:
                            `Among all members: ${members + bots}th\n` +
                            (member.user.bot
                                ? `Among the bots: ${bots}th`
                                : `Among the human members: ${members}th`),
                        inline: true
                    },
                    ...(inviteOrVanity
                        ? [
                              {
                                  name: "Invite Information",
                                  value:
                                      `Invite Link: https://discord.gg/${
                                          inviteOrVanity?.vanity?.code ??
                                          inviteOrVanity?.invite?.code
                                      }\nUses: ${
                                          inviteOrVanity?.vanity?.uses ??
                                          inviteOrVanity?.invite?.uses
                                      }` +
                                      (!inviteOrVanity.isVanity
                                          ? `\nInvited By: ${
                                                inviteOrVanity.invite.inviterId
                                                    ? `<@${inviteOrVanity.invite.inviterId}> (${inviteOrVanity.invite.inviterId})`
                                                    : "Unknown"
                                            }` +
                                            (inviteOrVanity.invite.createdAt
                                                ? `\nCreated: <t:${Math.round(
                                                      inviteOrVanity.invite.createdAt.getTime() /
                                                          1000
                                                  )}:R>`
                                                : "") +
                                            (inviteOrVanity.invite.expiresAt
                                                ? `\nExpires: <t:${Math.round(
                                                      inviteOrVanity.invite.expiresAt.getTime() /
                                                          1000
                                                  )}:R>`
                                                : "") +
                                            (inviteOrVanity.invite.channelId
                                                ? `\nChannel: <#${inviteOrVanity.invite.channelId}> (${inviteOrVanity.invite.channelId})`
                                                : "") +
                                            (inviteOrVanity.invite.temporary
                                                ? "\n\n__This is a temporary invite.__"
                                                : "")
                                          : "")
                              }
                          ]
                        : [])
                ],
                footerText: `Joined • ${
                    member.guild.members.cache.size >= member.guild.memberCount
                        ? member.guild.members.cache.size
                        : member.guild.memberCount
                } members total`
            },
            undefined,
            "join_leave_channel"
        );
    }

    async logGuildMemberRemove(member: GuildMember) {
        if (!this.client.configManager.config[member.guild.id]?.logging?.events.member_leave) {
            return;
        }

        const joinedAt = Math.round((member.joinedAt?.getTime() ?? Date.now()) / 1000);

        await this.sendLogEmbed(
            member.guild,
            {
                title: "Member left",
                user: member.user,
                color: 0xf14a60,
                fields: [
                    {
                        name: "Roles",
                        value:
                            member.roles.cache.size === 1
                                ? "**No roles**"
                                : member.roles.cache
                                      .filter(role => role.id !== member.guild.id)
                                      .sort((m1, m2) => m2.position - m1.position)
                                      .reduce((acc, role) => `${acc} ${roleMention(role.id)}`, "")
                    },
                    {
                        name: "Joined At",
                        value: `<t:${joinedAt}:f> (<t:${joinedAt}:R>)`
                    },
                    {
                        name: "User Information",
                        value: `Username: ${
                            member.user.username
                        }\nMention: ${member.user.toString()}\nID: ${member.user.id}`
                    },
                    {
                        name: "Bot?",
                        value: member.user.bot ? "Yes" : "No",
                        inline: true
                    }
                ],
                footerText: `Left • ${
                    member.guild.members.cache.size >= member.guild.memberCount
                        ? member.guild.members.cache.size
                        : member.guild.memberCount
                } members total`
            },
            undefined,
            "join_leave_channel"
        );
    }

    async logMessageEdit(oldMessage: Message, newMessage: Message) {
        if (!this.client.configManager.config[newMessage.guildId!]?.logging?.events.message_edit) {
            return;
        }

        const changedEmbeds = [];
        const mainArray =
            oldMessage.embeds.length > newMessage.embeds.length
                ? oldMessage.embeds
                : newMessage.embeds;
        const mainArrayRef =
            oldMessage.embeds.length > newMessage.embeds.length ? "oldMessage" : "newMessage";
        const otherArray =
            oldMessage.embeds.length > newMessage.embeds.length
                ? newMessage.embeds
                : oldMessage.embeds;

        outerLoop: for (const embed of mainArray) {
            for (const otherEmbed of otherArray) {
                if (embed.equals(otherEmbed)) {
                    continue outerLoop;
                }
            }

            changedEmbeds.push({
                old: mainArrayRef === "oldMessage" ? embed : otherArray,
                new: mainArrayRef === "newMessage" ? embed : otherArray
            });
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Go to context")
                .setURL(
                    `https://discord.com/channels/${newMessage.guildId!}/${newMessage.channelId!}/${
                        newMessage.id
                    }`
                )
        );

        if (newMessage.type === MessageType.Reply)
            row.addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Go to referenced message")
                    .setURL(
                        `https://discord.com/channels/${newMessage.guildId!}/${newMessage.channelId!}/${
                            newMessage.reference!.messageId
                        }`
                    )
            );

        await this.sendLogEmbed(
            newMessage.guild!,
            {
                title: "Message Updated",
                user: newMessage.author,
                color: 0x007bff,
                options: {
                    description: `### Before\n${oldMessage.content}\n\n### After\n${newMessage.content}`
                },
                fields: [
                    {
                        name: "User",
                        value: `${newMessage.author.toString()}\nUsername: ${
                            newMessage.author.username
                        }\nID: ${newMessage.author.id}`
                    },
                    {
                        name: "Channel",
                        value: `${newMessage.channel.toString()}\nName: ${
                            (newMessage.channel as TextChannel).name
                        }\nID: ${newMessage.channel.id}`,
                        inline: true
                    },
                    {
                        name: "Message",
                        value: `Link: [Click here](${`https://discord.com/channels/${newMessage.guildId!}/${newMessage.channelId!}/${
                            newMessage.id
                        }`})\nID: ${newMessage.id}`,
                        inline: true
                    },
                    ...(changedEmbeds.length > 0
                        ? [
                              {
                                  name: "Embeds",
                                  value: "The changed embeds are sent as JSON with this log message."
                              }
                          ]
                        : [])
                ],
                footerText: "Updated"
            },
            {
                components: [row],
                files:
                    changedEmbeds.length > 0
                        ? [
                              {
                                  name: "changed_embeds.json",
                                  attachment: Buffer.from(JSON.stringify(changedEmbeds, null, 4))
                              }
                          ]
                        : undefined
            },
            "message_logging_channel"
        );
    }

    async logMessageDelete(message: Message, moderator?: User | null) {
        if (!this.client.configManager.config[message.guildId!]?.logging?.events.message_delete) {
            return;
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Go to context")
                .setURL(
                    `https://discord.com/channels/${message.guildId!}/${message.channelId!}/${
                        message.id
                    }`
                )
        );

        if (message.type === MessageType.Reply)
            row.addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Go to referenced message")
                    .setURL(
                        `https://discord.com/channels/${message.guildId!}/${message.channelId!}/${
                            message.reference!.messageId
                        }`
                    )
            );

        const fields = [
            {
                name: "User",
                value: `${message.author.toString()}\nUsername: ${message.author.username}\nID: ${
                    message.author.id
                }`,
                inline: !!moderator
            }
        ];

        if (moderator) {
            fields.push({
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            });
        }

        fields.push(
            {
                name: "Channel",
                value: `${message.channel.toString()}\nName: ${
                    (message.channel as TextChannel).name
                }\nID: ${message.channel.id}`,
                inline: !moderator
            },
            {
                name: "Message",
                value: `Link: [Click here](${`https://discord.com/channels/${message.guildId!}/${message.channelId!}/${
                    message.id
                }`})\nID: ${message.id}`,
                inline: true
            }
        );

        await this.sendLogEmbed(
            message.guild!,
            {
                title: "Message Deleted",
                color: Colors.Red,
                user: message.author,
                options: {
                    description: message.content
                },
                fields,
                footerText: "Deleted"
            },
            {
                components: [row],
                files: [
                    ...message.attachments
                        .map(
                            a =>
                                ({
                                    attachment: a.proxyURL,
                                    name: a.name
                                } as AttachmentBuilder)
                        )
                        .values()
                ],
                embeds: message.embeds
            },
            "message_logging_channel"
        );
    }

    async logRaid({ guild, action }: { guild: Guild; action: string }) {
        await this.sendLogEmbed(guild, {
            title: "Possible raid detected",
            reason: "Too many users joined in a short timeframe.",
            color: Colors.Red,
            fields: [
                {
                    name: "Action",
                    value: action
                }
            ],
            footerText: "Raid detected"
        });
    }

    async logServerLockOrUnlock({
        guild,
        action,
        moderator,
        countInvalidChannel,
        countSkipped,
        countFailed,
        countSuccess,
        reason
    }: {
        guild: Guild;
        action: "Locked" | "Unlocked";
        moderator: User;
        countInvalidChannel: number;
        countSkipped: number;
        countFailed: number;
        countSuccess: number;
        reason?: string;
    }) {
        const results = `${
            countInvalidChannel === 0 ? "" : `InvalidChannel: ${countInvalidChannel}\n`
        }${countSkipped === 0 ? "" : `Skipped: ${countSkipped}\n`}${
            countSuccess === 0 ? "" : `Success: ${countSuccess}\n`
        }${countFailed === 0 ? "" : `Failed: ${countFailed}\n`}`;

        await this.sendLogEmbed(guild, {
            title: `Server ${action.toLowerCase()}`,
            reason: reason ?? "The user ran a command to perform this action",
            moderator,
            color: 0x007bff,
            footerText: action,
            options: {
                description: `Results:\n\n${results.trim() === "" ? "*Nothing changed*" : results}`
            }
        });
    }

    async logChannelLockOrUnlock({
        guild,
        action,
        moderator,
        channel,
        reason
    }: {
        guild: Guild;
        action: "Locked" | "Unlocked";
        moderator: User;
        channel: GuildChannel;
        reason?: string;
    }) {
        await this.sendLogEmbed(guild, {
            title: `Channel ${action.toLowerCase()}`,
            reason: reason ?? "The user ran a command to perform this action",
            moderator,
            color: 0x007bff,
            footerText: action,
            fields: [
                {
                    name: "Channel",
                    value: `${channel.toString()} (${channel.id})`
                }
            ]
        });
    }

    async logUserBan({
        moderator,
        user,
        deleteMessageSeconds,
        reason,
        guild,
        id,
        duration,
        includeDeleteMessageSeconds = true
    }: LogUserBanOptions) {
        await this.sendLogEmbed(
            guild,
            {
                user,
                title: "A user was banned",
                footerText: (duration ? "Temporarily " : "") + "Banned",
                reason: reason ?? null,
                moderator,
                id,
                color: Colors.Red,
                fields: [
                    ...(includeDeleteMessageSeconds
                        ? [
                              {
                                  name: "Message Deletion Timeframe",
                                  value: deleteMessageSeconds
                                      ? formatDistanceToNowStrict(
                                            new Date(Date.now() - deleteMessageSeconds * 1000)
                                        )
                                      : "*No timeframe provided*"
                              }
                          ]
                        : []),
                    ...(duration
                        ? [
                              {
                                  name: "Duration",
                                  value: formatDistanceToNowStrict(new Date(Date.now() - duration))
                              }
                          ]
                        : [])
                ]
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logUserSoftBan({
        moderator,
        user,
        deleteMessageSeconds,
        reason,
        guild,
        id
    }: LogUserBanOptions) {
        await this.sendLogEmbed(
            guild,
            {
                user,
                title: "A user was softbanned",
                footerText: "Softbanned",
                reason: reason ?? null,
                moderator,
                id,
                color: Colors.Red,
                fields: [
                    {
                        name: "Message Deletion Timeframe",
                        value: deleteMessageSeconds
                            ? formatDistanceToNowStrict(
                                  new Date(Date.now() - deleteMessageSeconds * 1000)
                              )
                            : "*No timeframe provided*"
                    }
                ]
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logUserUnban({ moderator, user, reason, guild, id }: LogUserUnbanOptions) {
        this.sendLogEmbed(
            guild,
            {
                user,
                title: "A user was unbanned",
                footerText: "Unbanned",
                reason: reason ?? null,
                moderator,
                id,
                color: Colors.Green
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logMemberKick({
        moderator,
        member,
        reason,
        guild,
        id,
        user
    }: CommonUserActionOptions & { member?: GuildMember; user?: User; reason?: string }) {
        this.sendLogEmbed(
            guild,
            {
                user: user ?? member!.user,
                title: "A member was kicked",
                footerText: "Kicked",
                reason: reason ?? null,
                moderator,
                id,
                color: Colors.Orange
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logMemberMute({
        moderator,
        member,
        reason,
        guild,
        id,
        duration
    }: CommonUserActionOptions & { member: GuildMember; reason?: string; duration?: number }) {
        this.sendLogEmbed(
            guild,
            {
                user: member.user,
                title: "A member was muted",
                footerText: "Muted",
                reason: reason ?? null,
                moderator,
                id,
                color: Colors.DarkGold,
                fields: [
                    {
                        name: "Duration",
                        value: duration
                            ? formatDistanceToNowStrict(new Date(Date.now() - duration))
                            : "*No duration was specified*"
                    }
                ]
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logMemberWarning({
        moderator,
        member,
        reason,
        guild,
        id
    }: CommonUserActionOptions & { member: GuildMember; reason?: string }) {
        this.sendLogEmbed(
            guild,
            {
                user: member.user,
                title: "A member was warned",
                footerText: "Warned",
                reason: reason ?? null,
                moderator,
                id,
                color: Colors.Gold
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logBulkDeleteMessages({
        messages,
        moderator,
        user,
        reason,
        guild,
        id,
        count,
        channel
    }: LogMessageBulkDelete) {
        const sendJSON = this.client.configManager.config[guild.id]?.logging?.bulk_delete_send_json;

        const message = await this.sendLogEmbed(
            guild,
            {
                user,
                title: "Messages deleted in bulk",
                footerText: "Deleted",
                reason: reason ?? null,
                moderator,
                id,
                color: Colors.DarkRed,
                fields: [
                    {
                        name: "Deleted Message Count",
                        value: `${count}`
                    },
                    {
                        name: "Channel",
                        value: `${channel.toString()} (${channel.id})`
                    }
                ]
            },
            sendJSON && messages.length > 0
                ? {
                      files: [
                          {
                              attachment: this.generateBulkDeleteJSON(messages),
                              name: "messages.json"
                          }
                      ]
                  }
                : undefined,
            "infraction_logging_channel"
        );

        if (messages.length > 0 && sendJSON) {
            message
                ?.edit({
                    embeds: [
                        {
                            ...(message?.embeds[0]?.data ?? {}),
                            fields: [
                                ...(message?.embeds[0].data.fields ?? []),
                                {
                                    name: "Messages",
                                    value: `[Click here to view the deleted messages](${
                                        process.env.FRONTEND_URL
                                    }/view_deleted_messages?url=${encodeURIComponent(
                                        message.attachments.at(0)!.url
                                    )})`
                                }
                            ]
                        }
                    ]
                })
                .catch(logError);
        }
    }

    async logMemberUnmute({
        moderator,
        member,
        reason,
        guild,
        id
    }: CommonUserActionOptions & { member: GuildMember; reason?: string }) {
        this.sendLogEmbed(
            guild,
            {
                user: member.user,
                title: "A member was unmuted",
                footerText: "Unmuted",
                reason: reason ?? null,
                moderator,
                id,
                color: Colors.Green
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logBlockedWordOrToken({
        guild,
        user,
        blockType,
        token,
        word,
        message,
        content
    }: BlockedTokenOrWordOptions) {
        let value: string;
        let title: string;

        switch (blockType) {
            case "token":
                value = `||${escapeMarkdown(token!)}||`;
                title = "Posted blocked token(s)";
                break;
            case "word":
                value = `||${escapeMarkdown(word!)}||`;
                title = "Posted blocked word(s)";
                break;
            case "message":
                value = `||${escapeMarkdown(message!)}||`;
                title = "Posted blocked message(s)";
                break;
            default:
                return;
        }

        this.sendLogEmbed(guild, {
            user,
            title,
            footerText: "AutoMod",
            color: Colors.Yellow,
            fields: [
                {
                    name: blockType[0].toUpperCase() + blockType.substring(1),
                    value
                }
            ],
            options: {
                description: `${content}`
            }
        });
    }

    async logUserMassBan({
        users,
        reason,
        guild,
        moderator,
        deleteMessageSeconds
    }: LogUserMassBanOptions) {
        await this.sendLogEmbed(
            guild,
            {
                title: "A massban was executed",
                footerText: "Banned",
                reason: reason ?? null,
                moderator,
                color: Colors.Red,
                fields: [
                    {
                        name: "Message Deletion Timeframe",
                        value: deleteMessageSeconds
                            ? formatDistanceToNowStrict(
                                  new Date(Date.now() - deleteMessageSeconds * 1000)
                              )
                            : "*No timeframe provided*"
                    }
                ],
                options: {
                    description: `The following users were banned:\n\n${users.reduce(
                        (acc, user) =>
                            acc + (acc === "" ? "" : "\n") + "<@" + user + "> (`" + user + "`)",
                        ""
                    )}`
                }
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    async logMemberMassKick({
        users,
        reason,
        guild,
        moderator
    }: Omit<LogUserMassBanOptions, "deleteMessageSeconds">) {
        await this.sendLogEmbed(
            guild,
            {
                title: "A masskick was executed",
                footerText: "Kicked",
                reason: reason ?? null,
                moderator,
                color: Colors.Orange,
                options: {
                    description: `The following users were kicked:\n\n${users.reduce(
                        (acc, user) =>
                            acc + (acc === "" ? "" : "\n") + "<@" + user + "> (`" + user + "`)",
                        ""
                    )}`
                }
            },
            undefined,
            "infraction_logging_channel"
        );
    }

    generateBulkDeleteJSON(messages: MessageResolvable[]) {
        const mappedMessages = (
            (messages instanceof Collection ? [...messages.values()] : messages) as Message[]
        ).map(m => ({
            ...m,
            author: m.author,
            member: m.member,
            authorColor: m.member?.displayColor ?? m.member?.roles.highest.color,
            authorRoleIcon: m.member?.roles.highest.iconURL() ?? undefined,
            authorRoleName: m.member?.roles.highest.name ?? undefined,
            authorAvatarURL: m.author.displayAvatarURL(),
            mentions: {
                everyone: m.mentions.everyone,
                users: m.mentions.users.map(({ id, username }) => ({
                    id,
                    username
                })),
                members:
                    m.mentions.members?.map(({ nickname, user }) => ({
                        nickname: nickname ?? user.username,
                        id: user.id
                    })) ?? [],
                channels: (m.mentions.channels as Collection<string, GuildChannel>).map(
                    ({ id, name }) => ({ id, name })
                ),
                roles: m.mentions.roles.map(({ id, name }) => ({ id, name }))
            }
        }));

        return Buffer.from(
            JSON.stringify(
                {
                    messages: mappedMessages,
                    generatedAt: new Date().toISOString(),
                    channel: (messages.at(0) as Message)!.channel.toJSON({
                        id: true,
                        name: true,
                        type: true
                    }),
                    guild: {
                        id: (messages.at(0) as Message)!.guild!.id,
                        name: (messages.at(0) as Message)!.guild!.name,
                        iconURL: (messages.at(0) as Message)!.guild!.iconURL() ?? undefined
                    },
                    version: this.client.metadata.data.version
                },
                null,
                4
            )
        );
    }
}

interface LogMessageBulkDelete extends Omit<CommonUserActionOptions, "id"> {
    user?: User;
    reason?: string;
    count: number;
    channel: TextChannel;
    id?: string;
    messages: MessageResolvable[];
}

interface LogUserBanOptions extends BanOptions, CommonUserActionOptions {
    user: User;
    duration?: number;
    includeDeleteMessageSeconds?: boolean;
}

interface LogUserMassBanOptions extends BanOptions, Omit<CommonUserActionOptions, "id"> {
    users: string[];
}

interface LogUserUnbanOptions extends CommonUserActionOptions {
    user: User;
    reason?: string;
}

interface CommonUserActionOptions {
    moderator: User;
    guild: Guild;
    id: string;
}

interface BlockedTokenOrWordOptions {
    blockType: "token" | "word" | "message";
    token?: string;
    word?: string;
    message?: string;
    guild: Guild;
    user: User;
    content: string;
}

export interface CreateLogEmbedOptions {
    id?: string;
    title?: string;
    options?: EmbedData;
    moderator?: User;
    user?: User;
    fields?: APIEmbedField[];
    footerText?: string;
    reason?: string | null;
    timestamp?: Date | false | null;
    color?: ColorResolvable;
    showUserId?: boolean;
}
