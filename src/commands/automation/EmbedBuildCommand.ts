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

import { CommandInteraction, Message, Permissions } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import CommandOptions from '../../types/CommandOptions';
import { emoji, fetchEmoji } from '../../utils/Emoji';

export default class EmbedBuildCommand extends BaseCommand {
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];
    supportsInteractions: boolean = false;
    supportsLegacy: boolean = false;

    constructor() {
        super('embed__build', 'automation', []);
    }

    async run(client: DiscordClient, message: CommandInteraction | Message, options: InteractionOptions | CommandOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(`${emoji('error')} No embed schema provided.`);
            return;
        }

        try {
            const embedData = JSON.parse((options.isInteraction ? options.options.getString('json_schema')! : options.args.join(' ')).replace(/^embed\:/, ''));

            if (!embedData) {
                throw new Error('Parse Error');
            }

            try {
                const embed = new MessageEmbed(embedData);

                if (embedData.color) {
                    try {
                        embed.setColor(embedData.color);
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
                
                await message.channel?.send({
                    embeds: [embed]
                });
    
                if (message instanceof CommandInteraction)
                    await message.reply({ content: 'Message sent.', ephemeral: true });
                else 
                    message.react((await fetchEmoji('check'))!).catch(console.error);
            }
            catch (e) {
                console.log(e);
                message.reply({ content: 'Invalid options given.', ephemeral: true });
            }
        }
        catch (e) {
            console.log(e);
            message.reply({ content: 'Invalid embed JSON schema given.', ephemeral: true });
            return;
        }
    }
}