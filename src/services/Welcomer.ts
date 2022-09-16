import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import fs from 'fs';
import path from "path";
import Service from "../utils/structures/Service";

export default class Welcomer extends Service {
    messages: string[] = JSON.parse(fs.readFileSync(path.resolve(process.env.SUOD_PREFIX ?? path.join(__dirname, '..', '..'), 'resources', 'welcome_messages.json')).toString());

    generateEmbed(member: GuildMember, index?: number) {
        const { message, randomize } = this.client.config.props[member.guild.id].welcomer;
        let content: string = message ?? '';

        if (randomize) {
            content = this.generateMessage(index) + (message ? "\n" + content : '');
        }

        if (content.trim() === '') {
            return false;
        }

        content = content
            .replace(/:name:/g, member.displayName)
            .replace(/:tag:/g, member.user.tag)
            .replace(/:username:/g, member.user.username)
            .replace(/:discrim:/g, member.user.discriminator)
            .replace(/:avatar:/g, member.displayAvatarURL())
            .replace(/:date:/g, `<t:${member.joinedAt?.getTime()}>`)
            .replace(/:guild:/g, member.guild.name)
            .replace(/:mention:/g, member.toString());

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