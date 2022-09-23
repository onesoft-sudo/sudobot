
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

import { AutocompleteInteraction, CacheType, CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import dot from 'dot-object';
import { fetchEmoji } from '../../utils/Emoji';
import AutoCompleteOptions from '../../types/AutoCompleteOptions';

export default class ConfigCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    configDotted: { [key: string]: string[] } = {};

    constructor() {
        super('config', 'settings', []);
        const config = DiscordClient.client.config.props;
        
        for (const guild in config) {
            this.configDotted[guild] = Object.keys(dot.dot({...config[guild]}));
        }
    }

    async autoComplete(client: DiscordClient, interaction: AutocompleteInteraction<CacheType>, options: AutoCompleteOptions): Promise<void> {
        const focused = interaction.options.getFocused(true);

        if (focused.name !== "key") {
            return;
        }

        if (focused.value === '') {
            await interaction.respond(this.configDotted[interaction.guild!.id].slice(0, 25).map(key => ({
                name: key,
                value: key,
            })));

            return;
        }

        const response = [];

        for (const key of this.configDotted[interaction.guild!.id]) {
            if (key.includes(focused.value)) {
                response.push({
                    name: key,
                    value: key
                });

                if (response.length >= 25) {
                    break;
                }
            }
        }

        await interaction.respond(response);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        const keyMap = options.isInteraction ? options.options.getString('key') : options.args[0];
        const value = options.isInteraction ? options.options.getString('value') : options.args[1];

        if (keyMap && !value) {
            const val = dot.pick(keyMap, client.config.props[message.guild!.id]);

            await message.reply({
                content: val === undefined ? `${await fetchEmoji('error')} The given configuration key does not exist.` : (typeof val === 'object' ? "```json" + JSON.stringify(val, null, 2) + "```" : (val + ''))
            });
        }
        else if (keyMap && value) {
            if (dot.pick(keyMap, client.config.props[message.guild!.id]) === undefined) {
                await message.reply({ content: `${await fetchEmoji('error')} The given configuration key does not exist.` });
                return;
            }

            dot.set(keyMap, value, client.config.props[message.guild!.id]);
            await message.reply({ content: `${await fetchEmoji('check')} Configuration updated.` });
        }
    }
}