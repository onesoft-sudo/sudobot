/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import AwayFromKeyboardService from "@main/services/AwayFromKeyboardService";
import CommandManagerService from "@main/services/CommandManagerService";
import { ChannelType, Message, MessageType } from "discord.js";

class MessageCreateEventListener extends EventListener<Events.MessageCreate> {
    public override readonly type = Events.MessageCreate;

    private readonly supportedTypes = [MessageType.Default, MessageType.Reply, MessageType.ThreadStarterMessage];

    @Inject()
    private readonly commandManagerService!: CommandManagerService;

    @Inject()
    private readonly awayFromKeyboardService!: AwayFromKeyboardService;

    public override async onEvent(message: Message<boolean>): Promise<void> {
        if (message.author.bot || !this.supportedTypes.includes(message.type)) {
            return;
        }

        if (message.inGuild() || message.channel.type === ChannelType.GroupDM) {
            await this.awayFromKeyboardService.onMessageCreate(message);
        }

        if (await this.commandManagerService.run(message).catch(this.application.logger.error)) {
            return;
        }
    }
}

export default MessageCreateEventListener;
