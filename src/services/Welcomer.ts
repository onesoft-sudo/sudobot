import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import DiscordClient from "../client/Client";
import fs from 'fs';
import path from "path";
import Service from "../utils/structures/Service";

export default class Welcomer extends Service {
    messages: string[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'resources', 'welcome_messages.json')).toString());

    generateEmbed(member: GuildMember, index?: number) {
        const { message, randomize } = this.client.config.props[member.guild.id].welcomer;
        let content = message ?? '';

        if (randomize) {
            content = this.generateMessage(index) + (message ? "\n" + content : '');
        }

        if (content.trim() === '') {
            return false;
        }

        content = content
            .replace(':name:', member.displayName)
            .replace(':tag:', member.user.tag)
            .replace(':username:', member.user.username)
            .replace(':discrim:', member.user.discriminator)
            .replace(':avatar:', member.displayAvatarURL())
            .replace(':date:', `<t:${member.joinedAt?.getTime()}>`)
            .replace(':guild:', member.guild.name)
            .replace(':mention:', member.toString());

        return {
            content: member.toString(),
            embeds: [
                new MessageEmbed({
                    author: {
                        iconURL: member.displayAvatarURL(),
                        name: member.user.tag
                    },
                    description: content,
                    footer: {
                        text: 'Welcome'
                    }
                })
                .setColor('#007bff')
                .setTimestamp()
            ]
        };
    }
    
    async start(member: GuildMember, index?: number) {
        if (this.client.config.props[member.guild.id].welcomer.enabled) {
            const { channel: channelID } = this.client.config.props[member.guild.id].welcomer;
            
            try {
                const channel = (await member.guild.channels.fetch(channelID)) as TextChannel; 
                const options = this.generateEmbed(member, index);

                if (!options) {
                    return;
                }

                if (channel) {
                    await channel.send(options);
                }
            }
            catch (e) {
                console.log(e);                
            }
        }
    }

    generateMessage(index?: number) {
        return this.messages[index ?? Math.floor(this.messages.length * Math.random())];
    }
}