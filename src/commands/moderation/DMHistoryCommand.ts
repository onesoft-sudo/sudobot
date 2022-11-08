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

import { Message, CacheType, CommandInteraction, User, Util } from "discord.js";
import DiscordClient from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { fetchEmoji } from "../../utils/Emoji";
import ModerationHistoryGenerator from "../../utils/ModerationHistoryGenerator";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class DMHistoryCommand extends BaseCommand {
    name = "dmhistory";
    category = "moderation";
    aliases = ["historyreq", "sendlogs", "dmlogs"];
    coolDown = 1000 * 60 * 5;
    supportsInteractions = true;

    async run(client: DiscordClient, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (message instanceof CommandInteraction) {
            await message.deferReply({ ephemeral: true });
        }
        
        const user = message.member!.user as User;
        const historyGenerator = new ModerationHistoryGenerator(user, message.guild!);
        const { dmStatus, size } = await historyGenerator.generate(true);

        await this.deferReply(message, {
            content: `${dmStatus ? `${fetchEmoji("check")} The system has sent a DM to you. Sent ${size} records total.` : "The system was unable to deliver a DM to you because you have DMs disabled."}`,
        });

        await historyGenerator.removeTempFile();
    }
}