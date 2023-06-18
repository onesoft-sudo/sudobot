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

import { Message } from "discord.js";
import DiscordClient from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import { emoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class SnipeCommand extends BaseCommand {
    name = "snipe";
    category = "information";

    async run(client: DiscordClient, message: Message, options: CommandOptions) {
        const { lastDeletedMessage } = client.utils;

        if (!lastDeletedMessage) {
            await message.reply(`${emoji('error')} No deleted message was recorded yet.`);
            return;
        }

        await message.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: lastDeletedMessage.author.tag,
                        iconURL: lastDeletedMessage.author.displayAvatarURL(),
                    },
                    color: 'RANDOM',
                    description: lastDeletedMessage.content,
                    footer: {
                        text: "Sniped"
                    }
                })
                .setTimestamp()
            ]
        });
    }
}