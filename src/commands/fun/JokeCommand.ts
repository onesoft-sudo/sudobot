
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

import { CommandInteraction, Message, MessageEmbed } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import axios from 'axios';

export default class JokeCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    coolDown = 4000;

    constructor() {
        super('joke', 'fun', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (msg instanceof CommandInteraction) 
            await msg.deferReply();

        axios.get("https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist", {
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(async res => {
            if (res.data && !res.data.error) {
                await this.deferReply(msg, {
                    embeds: [
                        new MessageEmbed()
                        .setColor('#007bff')
                        .setTitle('Joke')
                        .setDescription(res.data.type === 'twopart' ? res.data.setup + '\n\n' + res.data.delivery : res.data.joke)
                        .addField('Category', res.data.category)
                        .setFooter({
                            text: `ID: ${res.data.id}`
                        })
                    ]
                });
            }
            else {
                await this.deferReply(msg, {
                    content: "Something went wrong with the API response. Please try again later."
                });
            }
        })
        .catch(async e => {
            console.log(e);
            await this.deferReply(msg, {
                content: "Something went wrong with the API. Please try again later."
            });
        })
    }
}