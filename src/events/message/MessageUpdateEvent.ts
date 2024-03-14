/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { log } from "console";
import { Message } from "discord.js";
import { logError } from "../../components/log/Logger";
import EventListener from "../../core/EventListener";
import { Events } from "../../types/ClientEvents";

export default class MessageUpdateEvent extends EventListener<Events.MessageUpdate> {
    public readonly name = Events.MessageUpdate;
    public readonly listeners = [
        (message: Message) => this.client.messageFilter.onMessageCreate(message),
        (message: Message) => this.client.messageRuleService.onMessageCreate(message)
    ];

    async execute(oldMessage: Message, newMessage: Message) {
        if (newMessage.author.bot) {
            return;
        }

        if (oldMessage.content === newMessage.content) return;

        this.client.emit(Events.NormalMessageUpdate, oldMessage, newMessage);

        this.client.statsService.onMessageUpdate(oldMessage, newMessage);

        for (const listener of this.listeners) {
            if (await listener(newMessage)) {
                return;
            }
        }

        await this.client.loggerService.logMessageEdit(oldMessage, newMessage);

        if (this.client.configManager.config[newMessage.guildId!]?.commands.rerun_on_edit) {
            const value = await this.client.commandManager
                .runCommandFromMessage(newMessage)
                .catch(logError);

            if (value === false) {
                log("Command or snippet not found: all strategies failed");
            }
        }
    }
}
