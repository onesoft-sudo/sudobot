
/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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