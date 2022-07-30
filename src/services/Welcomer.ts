import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import DiscordClient from "../client/Client";
import fs from 'fs';
import path from "path";

export default class Welcomer {
    messages: string[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'resources', 'welcome_messages.json')).toString());

    constructor(protected client: DiscordClient) {

    }

    async start(member: GuildMember) {
        if (this.client.config.props[member.guild.id].welcomer.enabled) {
            const { message, channel: channelID } = this.client.config.props[member.guild.id].welcomer;
            const content = (message ?? this.generateMessage())
                                    .replace(':name:', member.displayName)
                                    .replace(':tag:', member.user.tag)
                                    .replace(':username:', member.user.username)
                                    .replace(':discrim:', member.user.discriminator)
                                    .replace(':avatar:', member.displayAvatarURL())
                                    .replace(':date:', `<t:${member.joinedAt?.getTime()}>`)
                                    .replace(':guild:', member.guild.name)
                                    .replace(':mention:', member.toString());

            try {
                const channel = (await member.guild.channels.fetch(channelID)) as TextChannel; 

                if (channel) {
                    await channel.send({
                        embeds: [
                            new MessageEmbed({
                                author: {
                                    iconURL: member.displayAvatarURL(),
                                    name: member.user.tag
                                },
                                description: content,
                                timestamp: new Date()
                            })
                            .setColor('#007bff')
                        ]
                    });
                }
            }
            catch (e) {
                console.log(e);                
            }
        }
    }

    generateMessage() {
        return this.messages[Math.floor(this.messages.length * Math.random())];
    }
}