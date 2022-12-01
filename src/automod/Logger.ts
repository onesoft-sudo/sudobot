import { Message, MessageEmbedOptions, MessageEmbed as MessageEmbedDiscord, TextChannel, MessageActionRow, MessageButton, FileOptions, GuildBan, BanOptions, Guild, User } from "discord.js";
import ms from "ms";
import BaseMessageEmbed from "../client/MessageEmbed";
import { IPunishment } from "../models/Punishment";
import Service from "../utils/structures/Service";

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

        if (executor?.id === this.client.user!.id) {
            console.log("Action taken by bot");
            return;
        }

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
}