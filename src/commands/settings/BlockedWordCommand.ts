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

import { CommandInteraction, Message } from "discord.js";
import DiscordClient from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class BlockedWordCommand extends BaseCommand {
    name = "blockedword";
    group = "settings";
    aliases = ["bword", "blockedwords", "bannedword", "bannedword"];
    supportsInteractions = true;

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const subcommand = options.isInteraction ? options.options.getSubcommand(true) : options.argv[1];

        const subcommands = ["add", "remove", "has"];

        if (!subcommand) {
            await message.reply(`${emoji('error')} You must provide a subcommand with this command. The valid subcommands are: \`${subcommands.join('`, `')}\`.`);
            return;
        }

        if (!subcommands.includes(subcommand)) {
            await this.deferReply(message, `${emoji('error')} Invalid subcommand provided. The valid subcommands are: \`${subcommands.join('`, `')}\`.`);
            return;
        }

        if (!options.isInteraction && options.argv[2] === undefined) {
            await message.reply(`${emoji('error')} You must specify a word ${subcommand === 'add' ? 'to block' : (subcommand === 'remove' ? 'to remove' : 'to check')}!`);
            return;
        }

        if (message instanceof CommandInteraction) {
            await message.deferReply();
        }

        switch (subcommand) {
            case 'add':
                if (!options.isInteraction) {
                    options.args.shift();
                }

                const words = !options.isInteraction ? options.args : options.options.getString('words', true).split(/ +/);

                for await (const word of words) {
                    if (client.config.props[message.guildId!]?.filters.words.includes(word)) {
                        continue;
                    }
    
                    client.config.props[message.guildId!]?.filters.words.push(word);
                }

                client.config.write();

                await this.deferReply(message, `${emoji('check')} The given word(s) have been blocked.`);
            break;

            case 'has':
                const word = !options.isInteraction ? options.argv[2] : options.options.getString('word', true);

                if (client.config.props[message.guildId!]?.filters.words.includes(word)) {
                    await this.deferReply(message, `${emoji('check')} This word is in the blocklist.`);
                    return;
                }
                else {
                    await this.deferReply(message, `${emoji('error')} This word is not in the blocklist.`);
                    return;
                }
            break;

            case 'remove':
                const wordsToRemove = !options.isInteraction ? options.args : options.options.getString('words', true).split(/ +/);

                for await (const word of wordsToRemove) {
                    const index = client.config.props[message.guildId!]?.filters.words.indexOf(word);

                    if (index === -1) {
                        continue;
                    }

                    client.config.props[message.guildId!]?.filters.words.splice(index, 1);
                }
                
                client.config.write();
                await this.deferReply(message, `${emoji('check')} The given word(s) have been unblocked.`);
            break;
        }
    }
}