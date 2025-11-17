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

import type {
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    Message
} from "discord.js";
import CommandContextType from "./CommandContextType";
import Context, { type ContextReplyOptions } from "./Context";
import { requireNonNull } from "@framework/utils/utils";
import type Application from "@framework/app/Application";

class InteractionContext extends Context<CommandContextType.Interactive> {
    public override readonly type = CommandContextType.Interactive;
    public override readonly commandMessage: ChatInputCommandInteraction | ContextMenuCommandInteraction;
    public override readonly commandName: string;

    public constructor(
        application: Application,
        commandMessage: ChatInputCommandInteraction | ContextMenuCommandInteraction
    ) {
        super(application);
        this.commandMessage = commandMessage;
        this.commandName = commandMessage.commandName;
    }

    public override async reply(options: ContextReplyOptions): Promise<Message<boolean>> {
        if (this.commandMessage.deferred) {
            return this.commandMessage.editReply(options as InteractionEditReplyOptions);
        }

        const response = await this.commandMessage.reply(
            typeof options === "string"
                ? { content: options, withResponse: true }
                : ({ ...options, withResponse: true } as InteractionReplyOptions & { withResponse: true })
        );

        return requireNonNull(response.resource?.message);
    }
}

export default InteractionContext;
