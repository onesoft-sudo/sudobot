import { channelMention } from "@discordjs/builders";
import { Collection, Emoji, Guild, GuildMember, TextChannel } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import { fetchEmoji } from "../utils/Emoji";

export default class AutoClear {
    constructor(protected client: DiscordClient) {

    }

    async start(member: GuildMember, guild: Guild) {
        const config = await this.client.config.props[guild.id].autoclear;

        if (config.enabled) {
            for await (const channelID of config.channels) {
                try {
                    const channels = (<Collection<string, TextChannel>> await guild.channels.cache.filter(c => c.id === channelID || c.parent?.id === channelID)).toJSON();

                    if (channels) {
                        for await (const channel of channels) {
                            if (channel && channel.type === 'GUILD_TEXT') {
                                let fetched, count = 0;
        
                                do {
                                    fetched = await channel!.messages.fetch({ limit: 100 });
                                    fetched = await fetched.filter(m => m.author.id === member!.id);
                                    await channel.bulkDelete(fetched);
                                    count += await fetched.size;
                                }
                                while (fetched.size >= 2);
                        
                                const messageOptions = {
                                    embeds: [
                                        new MessageEmbed()
                                        .setColor('RED')
                                        .setAuthor({
                                            name: member.user.tag,
                                            iconURL: member.displayAvatarURL()
                                        })
                                        .setDescription((await fetchEmoji('check') as Emoji).toString() + " Deleted " + count + " message(s) from user " + member.user.tag + ' in channel ' + channelMention(channel.id))
                                        .addField('Reason', 'They left the server')
                                    ]
                                };
        
                                await this.client.logger.channelJoinLeft(async (ch) => {
                                    await ch.send(messageOptions);
                                }, member);
                            }
                        }
                    }
                } 
                catch (e) {
                    console.log(e);                    
                }
            }
        }
    }
}