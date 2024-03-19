/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { Message, MessageType } from "discord.js";
import { Inject } from "../../framework/container/Inject";
import EventListener from "../../framework/events/EventListener";
import { Events } from "../../framework/types/ClientEvents";
import CommandManager from "../../services/CommandManager";
import { safeMemberFetch } from "../../utils/fetch";

class MessageCreateEventListener extends EventListener<Events.MessageCreate> {
    public override readonly name = Events.MessageCreate;
    protected readonly types = [MessageType.Default, MessageType.Reply];

    @Inject()
    protected readonly commandManager!: CommandManager;

    public override async execute(message: Message<boolean>) {
        if (message.author.bot || !message.inGuild() || !this.types.includes(message.type)) {
            return;
        }

        if (!message.member) {
            Reflect.set(message, "member", await safeMemberFetch(message.guild, message.author.id));
        }

        const value = await this.commandManager.runCommandFromMessage(message);

        if (value === false) {
            this.client.logger.debug("Command or snippet not found: all strategies failed");
        }
    }
}

export default MessageCreateEventListener;
