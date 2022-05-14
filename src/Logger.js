const { MessageEmbed } = require('discord.js');
const util = require('./util');

class Logger {
    constructor() {
        
    }

    channel(callback, msg) {
        let channelID = app.config.props[msg.guild.id].logging_channel;
        let channel = msg.guild.channels.cache.find(c => c.id === channelID);

        if (channel) {
            return callback(channel);
        }
    }

    channelJoinLeft(callback, msg) {
        let channelID = app.config.props[msg.guild.id].logging_channel_join_leave;
        let channel = msg.guild.channels.cache.find(c => c.id === channelID);

        if (channel) {
            return callback(channel);
        }
    }

    logEdit(oldMsg, newMsg) {
        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#007bff')
                    .setTitle('Message Edited in #' + newMsg.channel.name + " (" + newMsg.channel.id + ")")
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

    logDelete(msg) {
        this.channel(async (channel) => {
            const embed = new MessageEmbed()
                .setColor('#f14a60')
                .setTitle('Message Deleted in #' + msg.channel.name + " (" + msg.channel.id + ")")
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

            if (msg.attachments.size > 0) {
                let str = '';

                msg.attachments.forEach(a => {
                    str += `**${a.name}** ${a.url}\n`;
                });

                embed.addField('Attachments', str);
            }

            await channel.send({
                embeds: [
                    embed
                ]
            });
        }, msg);
    }

    logBanned(ban) {
        this.channel(async (channel) => {
            let r = '*No reason provided*';

            if (ban.reason) {
                r = ban.reason;
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

    logUnbanned(ban) {
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

    logJoined(member) {
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
                    .addField('Account Created', `${member.user.createdAt.toLocaleString()} (${util.timeSince(member.user.createdAt.getTime())})`)
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

    logLeft(member) {
        this.channelJoinLeft(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setTitle("Member left")
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL(),
                    })
                    .addField('Joined at', `${member.joinedAt.toLocaleString()} (${util.timeSince(member.joinedAt.getTime())})`)
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

    logBeaned(member, r, d) {
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

    logMute(member, reason, timeMs, d) {
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
                    .addField('Duration Until', typeof timeMs === 'number' ? new Date((timeMs / 1000) + Date.now()).toLocaleString() : "*No duration set*")
                    .addField('User ID', member.user.id)
                    .setFooter({
                        text: "Muted",
                    })
                    .setTimestamp()
                ]
            });
        }, member);
    }

    logUnmute(member, d) {
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

    logWarn(msg, member, d, reason) {
        if (member.user)
            member = member.user;

        this.channel(async (channel) => {
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('GOLD')
                    .setTitle("Member warned")
                    .setAuthor({
                        name: member.tag,
                        iconURL: member.displayAvatarURL(),
                    })
                    .addField('Reason', reason)
                    .addField('Warned by', d.tag)
                    .addField('User ID', member.id)
                    .setFooter({
                        text: "Warned",
                    })
                    .setTimestamp()
                ]
            });
        }, msg);
    }

    logWarndel(msg, member, warn, d) {
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

module.exports = Logger;
