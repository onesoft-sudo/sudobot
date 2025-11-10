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

import type { Message, MessageCreateOptions } from "discord.js";
import CommandContextType from "./CommandContextType";
import Context, { type ContextReplyOptions } from "./Context";
import type Application from "@framework/app/Application";

class LegacyContext extends Context<CommandContextType.Legacy> {
    public override readonly type = CommandContextType.Legacy;
    public readonly commandMessage: Message<boolean>;
    public readonly commandName: string;
    public readonly commandContent: string;
    public readonly argv: string[];
    public readonly args: string[];

    public constructor(
        application: Application,
        commandMessage: Message<boolean>,
        commandName: string,
        commandContent: string,
        argv: string[],
        args: string[]
    ) {
        super(application);
        this.commandMessage = commandMessage;
        this.commandName = commandName;
        this.commandContent = commandContent;
        this.argv = argv;
        this.args = args;
    }

    public override reply(options: ContextReplyOptions): Promise<Message<boolean>> {
        return this.commandMessage.reply(options as MessageCreateOptions);
    }
}

export default LegacyContext;
