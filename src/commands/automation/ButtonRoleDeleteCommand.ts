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

import { Message, Interaction, CacheType, CommandInteraction, Permissions } from "discord.js";
import Client from "../../client/Client";
import InteractionRole from "../../models/InteractionRole";
import InteractionRoleMessage from "../../models/InteractionRoleMessage";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class ButtonRoleDeleteCommand extends BaseCommand {
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];
    name = "buttonrole__delete";
    category = "automation";

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[1] === undefined) {
            await message.reply(":x: Please specify the ID of the react role message.");
            return;
        }

        if (message instanceof CommandInteraction)
            await message.deferReply();

        const interactionRoleMessage = await InteractionRoleMessage.findOne({ 
            message_id: options.isInteraction ? options.options.getString('message_id', true) : options.args[1],
            guild_id: message.guildId!
        });
        
        if (!interactionRoleMessage) {
            await this.deferReply(message, ":x: No such reaction role message created with that ID!");
            return;
        }

        await InteractionRole.deleteMany({ _id: { $in: interactionRoleMessage.dbIDs } });
        await interactionRoleMessage.delete();

        await this.deferReply(message, "The reaction role message data was deleted, but the message itself was not deleted by the system so that you won't lose any important data on it, if you have.");
    }
}