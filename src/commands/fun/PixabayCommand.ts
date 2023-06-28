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
import { random } from '../../utils/util';


function url() {
    return `https://pixabay.com/api/?key=${process.env.PIXABAY_TOKEN}&safesearch=true&per_page=3`;
}

export async function image(cmd: BaseCommand, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions, type: 'photo' | 'all' | 'illustration' | 'vector') {
    let genurl = `${url()}&image_type=${type}`;
    let query = options.isInteraction ? options.options.getString('query') : null;

    if (!options.isInteraction) {
        let args = [...options.args];
        query = args.join(' ');
    }

    if (query && query.trim() !== '') {        
        let q = new URLSearchParams({q: query}).toString();
        console.log(q);
        genurl += `&${q}`;
    }

    axios.get(genurl)
    .then(async res => {
        if (res && res.status === 200) {
            //console.log(res.data.hits);
            if (!res.data.hits || res.data.hits?.length < 1) {
                await cmd.deferReply(msg, {
                    content: ":x: No search result found from the API."
                });
              
              return;
            }
            
            await cmd.deferReply(msg, {
                content: random(res.data.hits).largeImageURL
            });
        }
    })
    .catch(async err => {
        console.log(err.message);
        await cmd.deferReply(msg, {
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setDescription('Too many requests at the same time, please try again after some time.')
            ]
        });
    });
}

export async function photo(cmd: BaseCommand, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
    await image(cmd, msg, options, 'photo');
}

export async function vector(cmd: BaseCommand, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
    await image(cmd, msg, options, 'vector');
}

export async function illustration(cmd: BaseCommand, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
    await image(cmd, msg, options, 'illustration');
}

export default class PixabayCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('pixabay', 'fun', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least 1 argument.')
                ]
            });

            return;
        }

        if (msg instanceof CommandInteraction) 
            await msg.deferReply();

        const subcmd = options.isInteraction ? options.options.getSubcommand(true) : options.args[0];

        if (!options.isInteraction)
            await options.args.shift();

        if (subcmd === 'photo') {
            await photo(this, msg, options);
        }
        else if (subcmd === 'vector') {
            await vector(this, msg, options);
        }
        else if (subcmd === 'illustration') {
            await illustration(this, msg, options);
        }
        else if (subcmd === 'image') {
            await image(this, msg, options, 'all');
        }
        else {
            await this.deferReply(msg, {
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('Invalid subcommand provided.')
                ]
            });
        } 
    }
}