import { MessageAttachment, MessageReaction, TextChannel } from "discord.js";
import MessageEmbed from "../client/MessageEmbed";
import Service from "../utils/structures/Service";

export default class Starboard extends Service {
    async handle(reaction: MessageReaction) {
        if (this.client.config.get('starboard').enabled) {
            let emoji = reaction.emoji.name;
            
            console.log(emoji);

            if (emoji === '⭐' && reaction.message.channel.id !== this.client.config.get('starboard').channel && reaction.count === this.client.config.get('starboard').reactions) {
                try {
                    const channel = <TextChannel> await reaction.message.guild!.channels.fetch(this.client.config.get('starboard').channel);

                    let props = {
                        embeds: reaction.message.embeds || []
                    };
    
                    const msg = await channel.send({
                        embeds: [
                            ...props.embeds,
                            new MessageEmbed()
                            .setAuthor({
                                name: reaction.message.author!.tag,
                                iconURL: reaction.message.author!.displayAvatarURL(),
                            })
                            .setDescription(reaction.message.content!)
                            .addField('URL', `[Click here](${reaction.message.url})`)
                            .setTimestamp()
                            .setFooter({
                                text: reaction.message.id + ''
                            })
                        ],
                        files: reaction.message.attachments.map(a => {
                            return {
                                name: a.name,
                                attachment: a.proxyURL
                            } as MessageAttachment
                        })
                    });
    
                    await msg.react('⭐');
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
    }
};