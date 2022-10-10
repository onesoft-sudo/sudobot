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

export default class AboutCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    metadata = require('../../../package.json');

    constructor() {
        super('about', 'settings', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        await message.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({ iconURL: client.user?.displayAvatarURL(), name: "SudoBot" })
                .setDescription(`
                    __**A free and open source Discord moderation bot, specially created for The Everything Server**__.\n
                    > This bot comes with **ABSOLUTELY NO WARRANTY**.
                    > This is free software, and you are welcome to redistribute it under certain conditions.
                    > See the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html) for more detailed information.
                `)
                .addFields({
                    name: 'Version: ',
                    value: (`${this.metadata.version}`),
                    inline: true
                }, {
                    name: 'Source Code',
                    value: `[GitHub](${this.metadata.repository.url})`,
                    inline: true,
                }, {
                    name: 'Licensed Under',
                    value: `[GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html)`,
                    inline: true
                })
                .addFields({
                    name: "Author",
                    value: `[${this.metadata.author.name}](${this.metadata.author.url})`,
                    inline: true
                }, {
                    name: 'Support',
                    value: `rakinar2@onesoftnet.eu.org`,
                    inline: true
                })
                .setFooter({
                    text: `Copyright © OSN Inc 2022. All rights reserved.`
                })
            ]
        });
    }
}
