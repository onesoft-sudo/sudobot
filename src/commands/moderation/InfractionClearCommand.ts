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

import { Message, CacheType, CommandInteraction, Permissions } from "discord.js";
import Client from "../../client/Client";
import Punishment from "../../models/Punishment";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import getUser from "../../utils/getUser";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class InfractionClearCommand extends BaseCommand {
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];
    name = "infraction__clear";
    category = "moderation";
    aliases = [];
    supportsInteractions = true;

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(":x: You must provide an ID of the user to remove their infractions!");
            return;
        }
        
        if (message instanceof CommandInteraction)
            await message.deferReply();

        const user = options.isInteraction ? options.options.getUser('user', true) : await getUser(client, message as Message, options, 0);

        if (!user) {
            await this.deferReply(message, ":x: Invalid user given!");
            return;
        }

        const { deletedCount } = await Punishment.deleteMany({
            guild_id: message.guild!.id,
            user_id: user.id
        });

        await this.deferReply(message, {
            content: `${emoji('check')} Deleted **${deletedCount}** infractions for user **${user.tag}**.`
        });
    }
}