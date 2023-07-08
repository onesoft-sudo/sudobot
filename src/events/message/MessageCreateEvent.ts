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

import { ChannelType, ClientEvents, Message, MessageType } from "discord.js";
import Client from "../../core/Client";
import Event from "../../core/Event";

export default class MessageCreateEvent extends Event {
    public name: keyof ClientEvents = 'messageCreate';

    public types = [
        MessageType.Default,
        MessageType.Reply,
    ]

    constructor(protected client: Client) {
        super(client);
    }

    async execute(message: Message) {
        if (message.author.bot)
            return;

        if (!this.types.includes(message.type))
            return;

        if (message.channel.type === ChannelType.DM)
            return;

        const value = await this.client.commandManager.runCommandFromMessage(message).catch(console.error);

        if (!value) {
            console.log("Command not found");
        }
    }
}