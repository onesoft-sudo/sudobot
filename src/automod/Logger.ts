import { roleMention } from "@discordjs/builders";
import { formatDistanceStrict, formatDuration, intervalToDuration } from "date-fns";
import { Message, MessageEmbedOptions, MessageEmbed as MessageEmbedDiscord, TextChannel, MessageActionRow, MessageButton, FileOptions, GuildBan, BanOptions, Guild, User, GuildMember } from "discord.js";
import ms from "ms";
import BaseMessageEmbed from "../client/MessageEmbed";
import { IGuildInfo } from "../models/GuildInfo";
import Punishment, { IPunishment } from "../models/Punishment";
import PunishmentType from "../types/PunishmentType";
import Service from "../utils/structures/Service";
import { timeSince } from "../utils/util";

class MessageEmbed extends BaseMessageEmbed {
    constructor(options?: MessageEmbedDiscord | MessageEmbedOptions) {
        super(options);
        this.setTimestamp();
    }
}

export default class Logger extends Service {
    loggingChannel(id: string) {
        return this.client.guilds.cache.get(id)?.channels.cache.get(this.client.config.props[id].logging_channel) as (TextChannel | null);
    }

    loggingChannelJoinLeave(id: string) {
        return this.client.guilds.cache.get(id)?.channels.cache.get(this.client.config.props[id].logging_channel_join_leave) as (TextChannel | null);
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message) {
        await this.loggingChannel(newMessage.guild!.id)!.send({
            embeds: [
                new MessageEmbed({
                    title: "Message Updated",
                    author: {
                        name: oldMessage.author.tag,
                        iconURL: oldMessage.author.displayAvatarURL()
                    },
                    description: '**-+-+Before**\n' + oldMessage.content + '\n\n**-+-+After**\n' + newMessage.content,
                    fields: [
                        {
                            name: 'Message ID',
                            value: newMessage.id
                        },
                        {
                            name: 'User ID',
                            value: oldMessage.author.id
                        },
                        {
                            name: 'Channel',
                            value: `${oldMessage.channel} (${oldMessage.channelId})`
                        },
                    ],
                    footer: {
                        text: `Updated • ${newMessage.id}`
                    }
                }),
            ],
            components: [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel('Go to context')
                            .setStyle('LINK')
                            .setURL(newMessage.url)
                    )
            ]
        });
    }

    async onMessageDelete(message: Message) {
        const embed = new MessageEmbed({
            title: "Message Deleted",
            color: 0xf14a60,
            author: {
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL()
            },
            description: message.content,
            fields: [
                {
                    name: 'Message ID',
                    value: message.id
                },
                {
                    name: 'User ID',
                    value: message.author.id
                },
                {
                    name: 'Channel',
                    value: `${message.channel} (${message.channelId})`
                },
            ],
            footer: {
                text: `Deleted • ${message.id}`
            }
        });

        const files: FileOptions[] = [];

        if (message.attachments.size > 0) {
            let str = '';

            message.attachments.forEach(a => {
                str += `${a.name}\n`;
                files.push({
                    name: a.name!,
                    attachment: a.proxyURL
                });
            });

            embed.addFields({
                name: 'Attachments (top)', 
                value: str
            });
        }

        await this.loggingChannel(message.guild!.id)!.send({
            embeds: [
                embed
            ],
            components: [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setLabel('Go to context')
                            .setStyle('LINK')
                            .setURL(message.url)
                    )
            ],
            files
        });
    }

    async onGuildBanAdd(ban: GuildBan, _executor?: User) {
        const auditLog = (await ban.guild.fetchAuditLogs({
            limit: 1,
            type: 'MEMBER_BAN_ADD',
        })).entries.first();

        const executor = _executor ?? auditLog?.executor;

        if (executor?.id === this.client.user!.id) {
            console.log("Action taken by bot");
            return;
        }

        const guildBan = await ban.guild.bans.fetch(ban.user.id);
        const reason = ban.reason ?? guildBan.reason ?? '*No reason provided*';

        await this.loggingChannel(ban.guild.id)?.send({
            embeds: [
                new MessageEmbed()
                    .setColor('#f14a60')
                    .setTitle("A user was banned")
                    .setAuthor({
                        name: guildBan.user.tag,
                        iconURL: guildBan.user.displayAvatarURL(),
                    })
                    .addField('Reason', reason)
                    .addField('User ID', guildBan.user.id)
                    .addFields({
                        name: 'Banned by',
                        value: executor ? `${executor.tag} (${executor.id})` : 'Unknown'
                    })
                    .setFooter({
                        text: "Banned",
                    })
            ]
        });
    }

    async onGuildBanRemove(ban: GuildBan, _executor?: User) {
        const auditLog = (await ban.guild.fetchAuditLogs({
            limit: 1,
            type: 'MEMBER_BAN_REMOVE',
        })).entries.first();

        const executor = _executor ?? auditLog?.executor;

        await this.loggingChannel(ban.guild.id)?.send({
            embeds: [
                new MessageEmbed()
                    .setColor('#f14a60')
                    .setTitle("A user was unbanned")
                    .setAuthor({
                        name: ban.user.tag,
                        iconURL: ban.user.displayAvatarURL(),
                    })
                    .addField('User ID', ban.user.id)
                    .addFields({
                        name: 'Unbanned By',
                        value: executor ? `${executor.tag} (${executor.id})` : 'Unknown'
                    })
                    .setFooter({
                        text: "Unbanned",
                    })
                    .setTimestamp()
            ]
        });
    }

    async onSoftban(banOptions: BanOptions, guild: Guild, user: User, model: IPunishment) {
        let r = banOptions.reason ?? '*No reason provided*';

        await this.loggingChannel(guild.id)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setTitle("A user was softbanned")
                .setAuthor({
                    name: user.tag,
                    iconURL: user.displayAvatarURL(),
                })
                .addField('Reason', r)
                .addField('Softbanned by', `${model.mod_tag} (${model.mod_id})`)
                .addField('User ID', user.id)
                .setFooter({
                    text: "Softbanned",
                })
                .setTimestamp()
            ]
        });
    }
    
    async onTempBan(banOptions: BanOptions, guild: Guild, user: User, model: IPunishment) {
        let r = banOptions.reason ?? '*No reason provided*';

        await this.loggingChannel(guild.id)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setTitle("A user was temporarily banned")
                .setAuthor({
                    name: user.tag,
                    iconURL: user.displayAvatarURL(),
                })
                .addField('Reason', r)
                .addField('Banned by', `${model.mod_tag} (${model.mod_id})`)
                .addField('User ID', user.id)
                .addField('Duration', ms((model.meta as any).time))
                .setFooter({
                    text: "Temporarily banned",
                })
                .setTimestamp()
            ]
        });
    }

    async onGuildMemberAdd(member: GuildMember, info?: IGuildInfo) {
        await this.loggingChannelJoinLeave(member.guild.id)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('#007bff')
                .setTitle("New member joined")
                .setAuthor({
                    name: member.user.tag,
                    iconURL: member.user.displayAvatarURL(),
                })
                .setDescription(`<@${member.user.id}> just joined the server!`)
                .addField('Account Created', `${member.user.createdAt.toLocaleString()} (${timeSince(member.user.createdAt.getTime())})`)
                .addField('New Account?', (new Date().getTime() - member.user.createdAt.getTime()) <= 3 * 24 * 60 * 60 * 1000 ? ":warning: Yes :warning:" : "No")
                .addField('Bot?', member.user.bot === true ? 'Yes' : 'No')
                .addField('User ID', member.user.id)
                .addFields({
                    name: 'Total Members Joined',
                    value: info?.totalMembersJoined?.toString() ?? '*Information unavailable*'
                })
                .setFooter({
                    text: "Joined",
                })
                .setTimestamp()
            ]
        });
    }
    
    async onGuildMemberRemove(member: GuildMember) {
        const roles = member.roles.cache.filter(role => role.id !== member.guild.id).reduce((acc, val) => ` ${acc} ${roleMention(val.id)}`, '');

        await this.loggingChannelJoinLeave(member.guild.id)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setTitle("Member left")
                .setAuthor({
                    name: member.user.tag,
                    iconURL: member.user.displayAvatarURL(),
                })
                .setDescription(`**Roles**\n${roles}`)
                .addField('Joined at', `${member.joinedAt!.toLocaleString()} (${timeSince(member.joinedAt!.getTime())})`)
                .addField('User ID', member.user.id)
                .addField('Bot?', member.user.bot === true ? 'Yes' : 'No')
                .setFooter({
                    text: "Left",
                })
                .setTimestamp()
            ]
        });
    }

    async onMemberShot(member: GuildMember, moderator: User, reason?: string) {
        await this.loggingChannel(member.guild.id)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('#007bff')
                .setTitle("Member got shot")
                .setAuthor({
                    name: member.user.tag,
                    iconURL: member.user.displayAvatarURL(),
                })
                .addField('Reason', reason ?? '*No reason provided*')
                .addField('Doctor 💉', moderator.tag)
                .addField('User ID', member.user.id)
                .setFooter({
                    text: "Shot delivered",
                })
                .setTimestamp()
            ]
        });
    }

    async onMemberKick(member: GuildMember, reason?: string, executor?: User) {
        await this.loggingChannel(member.guild.id)?.send({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL(),
                    },
                    title: 'Member Kicked',
                    description: 'This user has left the server, probably due to a kick.',
                    fields: [
                        {
                            name: 'Kicked by',
                            value: executor?.tag ?? 'Unknown'
                        },
                        {
                            name: 'Reason',
                            value: reason ?? '*No reason provided*'
                        }
                    ],
                    footer: {
                        text: 'Kicked'
                    }
                })
                .setTimestamp()
            ]
        });
    }

    async onMemberMute(member: GuildMember, duration?: number, reason?: string, executor?: User, hard = false) {
        await this.loggingChannel(member.guild.id)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setTitle("Member muted")
                .setAuthor({
                    name: member.user.tag,
                    iconURL: member.user.displayAvatarURL(),
                })
                .addField('Reason', reason ?? '*No reason provided*')
                .addField('Muted by', executor?.tag ?? 'Unknown')
                .addField('Duration Until', duration ? `${(new Date(Date.now() + duration)).toLocaleString()} (${formatDuration(intervalToDuration({ start: 0, end: duration }))})` : "*No duration set*")
                .addField('User ID', member.user.id)
                .addField('Hardmute', hard ? 'Yes' : 'No')
                .setFooter({
                    text: "Muted",
                })
                .setTimestamp()
            ]
        });
    }
    
    async onMemberUnmute(member: GuildMember, executor?: User) {
        await this.loggingChannel(member.guild.id)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('#007bff')
                .setTitle("Member unmuted")
                .setAuthor({
                    name: member.user.tag,
                    iconURL: member.user.displayAvatarURL(),
                })
                .addField('Unmuted by', executor?.tag ?? 'Unknown')
                .addField('User ID', member.user.id)
                .setFooter({
                    text: "Unmuted",
                })
                .setTimestamp()
            ]
        });
    }

    async onMemberWarn(user: User, guildID: string, id: string, reason?: string, moderator?: User) {
        await this.loggingChannel(guildID)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('GOLD')
                .setTitle("Member warned")
                .setAuthor({
                    name: user.tag,
                    iconURL: user.displayAvatarURL(),
                })
                .addField('Reason', reason ?? '*No reason provided*')
                .addField('Warned by', moderator?.tag ?? '*No reason provided*')
                .addField('User ID', user.id)
                .addField('Case ID', id + '')
                .setFooter({
                    text: "Warned",
                })
                .setTimestamp()
            ]
        });
    }

    async onMemberWarningDelete(member: GuildMember, id: string, reason?: string, moderator?: User) {
        await this.loggingChannel(member.guild.id)?.send({
            embeds: [
                new MessageEmbed()
                .setColor('GOLD')
                .setTitle("Warning deleted")
                .setAuthor({
                    name: member.user.tag,
                    iconURL: member.user.displayAvatarURL(),
                })
                .addField('Warned by', moderator?.tag ?? 'Unknown')
                .addField('Warning ID', id + '')
                .addField('User ID', member.user.id)
                .setFooter({
                    text: "Warning Deleted",
                })
                .setTimestamp()
            ]
        });
    }

    async onMemberUpdate(oldMember: GuildMember, newMember: GuildMember) {
        if (oldMember.isCommunicationDisabled() && !newMember.isCommunicationDisabled()) {
            setTimeout(async () => {
                const auditLog = await newMember.guild.fetchAuditLogs({
                    type: 'MEMBER_UPDATE',
                    limit: 1,
                });
    
                const data = auditLog?.entries.first();

                console.log(data);
    
                Punishment.create({
                    createdAt: new Date(),
                    guild_id: newMember.guild.id,
                    mod_id: data?.executor?.id,
                    mod_tag: data?.executor?.tag,
                    user_id: newMember.user.id,
                    type: PunishmentType.TIMEOUT_REMOVE,
                }).catch(console.error);

                await this.loggingChannel(newMember.guild.id)?.send({
                    embeds: [
                        new MessageEmbed()
                        .setColor('GOLD')
                        .setTitle("Member Timeout Removed")
                        .setAuthor({
                            name: newMember.user.tag,
                            iconURL: newMember.user.displayAvatarURL(),
                        })
                        .addField('Removed by', data?.target?.id === newMember.user.id && data?.executor?.tag ? `${data?.executor?.tag} (${data?.executor?.id})` : '*Timeout expired automatically*')
                        .addField('User ID', oldMember.user.id)
                        .setFooter({
                            text: "Timeout Removed",
                        })
                        .setTimestamp()
                    ]
                });
            }, 2000);
        }
        else if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
            setTimeout(async () => {
                const auditLog = await newMember.guild.fetchAuditLogs({
                    type: 'MEMBER_UPDATE',
                    limit: 1,
                });
    
                const data = auditLog?.entries.first();

                console.log(data);

                Punishment.create({
                    createdAt: new Date(),
                    guild_id: newMember.guild.id,
                    mod_id: data?.executor?.id,
                    mod_tag: data?.executor?.tag,
                    reason: data?.reason,
                    user_id: newMember.user.id,
                    type: PunishmentType.TIMEOUT,
                    meta: {
                        time: ms(newMember.communicationDisabledUntilTimestamp - Date.now())
                    }
                }).catch(console.error);
    
                await this.loggingChannel(newMember.guild.id)?.send({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setTitle("Member Timed Out")
                        .setAuthor({
                            name: newMember.user.tag,
                            iconURL: newMember.user.displayAvatarURL(),
                        })
                        .addFields({
                            name: 'Reason',
                            value: data?.reason ?? '*No reason provided*'
                        }, {
                            name: 'Duration',
                            value: newMember.communicationDisabledUntil ? `${newMember.communicationDisabledUntil.toUTCString()} (${formatDistanceStrict(newMember.communicationDisabledUntil, new Date())})` : 'Unknown'
                        })
                        .addField('Action taken by', data?.target?.id === newMember.user.id && data?.executor?.tag ? `${data?.executor?.tag} (${data?.executor?.id})` : 'Unknown')
                        .addField('User ID', oldMember.user.id)
                        .setFooter({
                            text: "Timed-out",
                        })
                        .setTimestamp()
                    ]
                });
            }, 2000);
        }
    }
}