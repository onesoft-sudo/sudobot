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

import { channelMention } from "@discordjs/builders";
import { Collection, Emoji, Guild, GuildMember, TextChannel } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import { fetchEmoji } from "../utils/Emoji";
import { hasConfig } from "../utils/util";

export default class AutoClear {
    constructor(protected client: DiscordClient) {

    }

    async start(member: GuildMember, guild: Guild) {
        if (!hasConfig(this.client, guild.id, "autoclear"))
            return;
        
        const config = this.client.config.props[guild.id].autoclear;

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
        
                                await this.client.logger.loggingChannel(member.guild.id)?.send(messageOptions);
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