
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

import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';

export default class MvsnippetCommand extends BaseCommand {
    constructor() {
        super('mvsnippet', 'utils', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[1] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        let name: string;
        let newName: string;

        if (options.isInteraction) {
            await (msg as CommandInteraction).deferReply();
            name = <string> await options.options.getString('old-name');
            newName = <string> await options.options.getString('new-name');
        }
        else {
            name = options.args[0];
            newName = options.args[1];
        }

        const oldsnippet = client.snippetManager.get(msg.guild!.id, name);
        const newsnippet = client.snippetManager.get(msg.guild!.id, newName);

        if (!oldsnippet) {
            await this.deferReply(msg, {
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription("No snippet exists with that name.")
                ]
            });

            return;
        }

        if (newsnippet) {
            await this.deferReply(msg, {
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription("A snippet already exists with the new name.")
                ]
            });

            return;
        }

        await client.snippetManager.deleteData(msg.guild!.id, name);
        await client.snippetManager.set(msg.guild!.id, newName, oldsnippet.content, oldsnippet.files);
        await client.snippetManager.write();

        await this.deferReply(msg, {
            embeds: [
                new MessageEmbed()
                .setDescription((await fetchEmoji('check'))!.toString() + " Snippet renamed")
            ]
        });
    }
}