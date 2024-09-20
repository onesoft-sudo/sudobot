/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type {
    ContextMenuCommandInteraction,
    User
} from "discord.js";
import {
    ChatInputCommandInteraction,
    MessageContextMenuCommandInteraction
} from "discord.js";
import Context from "./Context";
import { ContextType } from "./ContextType";

class InteractionContext<
    T extends ChatInputCommandInteraction | ContextMenuCommandInteraction =
        | ChatInputCommandInteraction
        | ContextMenuCommandInteraction
> extends Context<T> {
    public override readonly type;

    public constructor(commandName: string, commandMessage: T) {
        super(commandName, commandMessage);

        this.type =
            commandMessage instanceof ChatInputCommandInteraction
                ? ContextType.ChatInput
                : commandMessage instanceof MessageContextMenuCommandInteraction
                  ? ContextType.MessageContextMenu
                  : ContextType.UserContextMenu;
    }

    public override get userId(): string {
        return this.commandMessage.user.id;
    }

    public override get user(): User {
        return this.commandMessage.user;
    }

    public get options(): T["options"] {
        return this.commandMessage.options;
    }
}

export default InteractionContext;
