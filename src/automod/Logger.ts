import { roleMention } from '@discordjs/builders';
import { FileOptions, GuildBan, GuildMember, Message, MessageEmbed, TextChannel, User } from 'discord.js';
import DiscordClient from '../client/Client';
import { timeProcess, timeSince } from '../utils/util';

class Logger {
    client: DiscordClient;

    constructor(client: DiscordClient) {
        this.client = client;
    }

    channel(callback: (channel: TextChannel) => any, msg: Message | GuildBan) {
        let channelID = this.client.config.props[msg.guild!.id].logging_channel;
        let channel = msg.guild!.channels.cache.find(c => c.id === channelID) as TextChannel;

        if (channel) {
            return callback(channel);
        }
    }

    channelJoinLeft(callback: (channel: TextChannel) => any, msg: Message | GuildBan) {
        let channelID = this.client.config.props[msg.guild!.id].logging_channel_join_leave;
        let channel = msg.guild!.channels.cache.find(c => c.id === channelID) as TextChannel;

        if (channel) {
            return callback(channel);
        }
    }

    logEdit(oldMsg: Message, newMsg: Message) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#007bff')
                    .setTitle('Message Edited in #' + (newMsg.channel as TextChannel).name + " (" + newMsg.channel.id + ")")
                    .setDescription('**-+-+Before**\n' + oldMsg.content + '\n\n**-+-+After**\n' + newMsg.content)
                    .addField('ID', newMsg.id)
                    .setAuthor({
                        name: newMsg.author.tag,
                        iconURL: newMsg.author.displayAvatarURL(),
                    })
                    .setFooter({
                        text: "Edited",
                    })
                    .setTimestamp()
                ]
            });
        }, newMsg);
    }

    logDelete(msg: Message) {
        this.channel(async (channel) => {
            const embed = new MessageEmbed()
                .setColor('#f14a60')
                .setTitle('Message Deleted in #' + (msg.channel as TextChannel).name + " (" + msg.channel.id + ")")
                .setDescription(msg.content)
                .setAuthor({
                    name: msg.author.tag,
                    iconURL: msg.author.displayAvatarURL(),
                })
                .addField('ID', msg.id)
                .setFooter({
                    text: "Deleted",
                })
                .setTimestamp();
            
            const files: FileOptions[] = [];

            if (msg.attachments.size > 0) {
                let str = '';

                msg.attachments.forEach(a => {
                    str += `${a.name}\n`;
                    files.push({
                        name: a.name!,
                        attachment: a.proxyURL
                    });
                });

                embed.addField('Attachments (top)', str);
            }

            await channel.send({
                embeds: [
                    embed
                ],
                files
            });
        }, msg);
    }

    logBanned(ban: GuildBan) {
        this.channel(async (channel) => {
            let r = '*No reason provided*';

            const auditLog = (await ban.guild.fetchAuditLogs({
                limit: 1,
                type: 'MEMBER_BAN_ADD',
            })).entries.first();           
      

            if (ban.reason) {
                r = ban.reason;
            }
            else if (auditLog) {
                console.log(auditLog);  
                const { target, reason } = await auditLog;

                if (target!.id === ban.user.id && reason) {
                    r = await reason;
                }
            }

            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setTitle("A user was banned")
                    .setAuthor({
                        name: ban.user.tag,
                        iconURL: ban.user.displayAvatarURL(),
                    })
                    .addField('Reason', r)
                    .addField('User ID', ban.user.id)
                    .setFooter({
                        text: "Banned",
                    })
                    .setTimestamp()
                ]
            });
        }, ban);
    }

    logUnbanned(ban: GuildBan) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setTitle("A user was unbanned")
                    .setAuthor({
                        name: ban.user.tag,
                        iconURL: ban.user.displayAvatarURL(),
                    })
                    .addField('User ID', ban.user.id)
                    .setFooter({
                        text: "Unbanned",
                    })
                    .setTimestamp()
                ]
            });
        }, ban);
    }

    logJoined(member: GuildMember) {
        this.channelJoinLeft(async (channel) => {
            await channel.send({
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
                    .setFooter({
                        text: "Joined",
                    })
                    .setTimestamp()
                ]
            });
        }, member);
    }

    logLeft(member: GuildMember) {
        this.channelJoinLeft(async (channel) => {
            const roles = await member.roles.cache.filter(role => role.id !== member.guild.id).reduce((acc, val) => ` ${acc} ${roleMention(val.id)}`, '');

            await channel.send({
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
        }, member);
    }

    logBeaned(member: GuildMember, r: string, d: User) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#007bff')
                    .setTitle("Member beaned")
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL(),
                    })
                    .addField('Reason', r)
                    .addField('Beaned by', d.tag)
                    .addField('User ID', member.user.id)
                    .setFooter({
                        text: "Beaned",
                    })
                    .setTimestamp()
                ]
            });
        }, member);
    }

    logMute(member: GuildMember, reason: string, timeMs: number | null | undefined, d: User) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setTitle("Member muted")
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL(),
                    })
                    .addField('Reason', reason)
                    .addField('Muted by', d.tag)
                    .addField('Duration Until', typeof timeMs === 'number' ? `${new Date((timeMs / 1000) + Date.now()).toLocaleString()} (${timeProcess(timeMs / 1000)})` : "*No duration set*")
                    .addField('User ID', member.user.id)
                    .setFooter({
                        text: "Muted",
                    })
                    .setTimestamp()
                ]
            });
        }, member);
    }

    logUnmute(member: GuildMember, d: User) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#007bff')
                    .setTitle("Member unmuted")
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL(),
                    })
                    .addField('Unmuted by', d.tag)
                    .addField('User ID', member.user.id)
                    .setFooter({
                        text: "Unmuted",
                    })
                    .setTimestamp()
                ]
            });
        }, member);
    }

    logWarn(msg: Message, member: GuildMember | User, d: User, reason: string, id: number | string) {
        if ((member as GuildMember).user)
            member = (member as GuildMember).user;

        this.channel(async (channel) => {            
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('GOLD')
                    .setTitle("Member warned")
                    .setAuthor({
                        name: (member as User).tag,
                        iconURL: member.displayAvatarURL(),
                    })
                    .addField('Reason', reason)
                    .addField('Warned by', d.tag)
                    .addField('User ID', member.id)
                    .addField('Warning ID', id + '')
                    .setFooter({
                        text: "Warned",
                    })
                    .setTimestamp()
                ]
            });
        }, msg);
    }

    logWarndel(msg: Message, member: GuildMember, warn: any, d: User) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('GOLD')
                    .setTitle("Warning deleted")
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL(),
                    })
                    .addField('Warned by', d.tag + '')
                    .addField('Warning ID', warn.id + '')
                    .addField('User ID', member.user.id)
                    .setFooter({
                        text: "Warning Deleted",
                    })
                    .setTimestamp()
                ]
            });
        }, msg);
    }
}

export default Logger;
