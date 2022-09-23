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

import { CommandInteraction, FileOptions } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import path from 'path';

export default class AddsnippetCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super('snippet', 'utils', []);
    }

    async run(client: DiscordClient, msg: CommandInteraction, options: InteractionOptions) {
        if (options.options.getSubcommand(true) === 'get') {
            const snippet = await client.snippetManager.getParsed(msg.guild!.id, options.options.getString('name')!);

            if (!snippet) {
                await msg.reply({
                    content: ":x: No snippet found with that name.",
                    ephemeral: true
                });

                return;
            }

            try {
                await msg.reply({
                    content: snippet.content.trim() === '' ? undefined : snippet.content,
                    files: snippet.files.map(name => {
                        return {
                            name,
                            attachment: path.resolve(process.env.SUDO_PREFIX ?? path.join(__dirname, '../../..'), 'storage', name)
                        } as FileOptions
                    }),
                    embeds: snippet.embeds
                });
            }
            catch (e) {
                console.log(e);      
                await msg.reply({ content: 'Looks like that snippet is corrupted. Maybe invalid embed schema?', ephemeral: true });          
            }
        }

        let cmdName = '';

        if (options.options.getSubcommand(true) === 'create') 
            cmdName = 'addsnippet';
        else if (options.options.getSubcommand(true) === 'delete') 
            cmdName = 'delsnippet';
        else if (options.options.getSubcommand(true) === 'rename') 
            cmdName = 'mvsnippet';

        const command = await client.commands.get(cmdName);

        if (command) {
            return await command.run(client, msg, options);
        }
    }
}
