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

import { userMention } from "@discordjs/builders";
import { Message, Permissions, Util } from "discord.js";
import DiscordClient from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import Pagination from "../../utils/Pagination";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class StaffAwayCommand extends BaseCommand {
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    constructor() {
        super('staffawaylist', 'utils', ['safklist', 'sawaylist', 'awaylist']);
    }

    async run(client: DiscordClient, message: Message, options: CommandOptions) {
        if (client.utils.staffAwayList.length === 0) {
            await message.reply("No one has taken breaks.");
            return;
        }

        const pagination = new Pagination(client.utils.staffAwayList, {
            channel_id: message.channelId!,
            guild_id: message.guildId!,
            limit: 2,
            timeout: 180_000,
            user_id: message.author.id,
            embedBuilder(options) {
                let description = '';

                for (const entry of options.data) {
                    description += `User: ${userMention(entry.user)}\n`;
                    description += `Reason: ${Util.escapeMarkdown(entry.reason ?? 'No reason provided')}\n\n`;
                }

                return new MessageEmbed({
                    author: {
                        name: "Staff Break List"
                    },
                    description,
                    footer: {
                        text: `Page ${options.currentPage} of ${options.maxPages} • ${client.utils.staffAwayList.length} records total`
                    }
                });
            },
        });

        const reply = await message.reply(await pagination.getMessageOptions());
        pagination.start(reply!).catch(console.error);        
    }
}