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

import type { Message, User } from "discord.js";
import Context from "./Context";
import { ContextType } from "./ContextType";

class LegacyContext extends Context<Message<true>> {
    public override readonly type = ContextType.Legacy;
    public readonly args: string[];
    public readonly argv: string[];
    public readonly commandContent: string;

    public constructor(
        commandName: string,
        commandContent: string,
        commandMessage: Message<true>,
        args: string[],
        argv: string[]
    ) {
        super(commandName, commandMessage);
        this.args = args;
        this.argv = argv;
        this.commandContent = commandContent;
    }

    public override get userId(): string {
        return this.commandMessage.author.id;
    }

    public override get user(): User {
        return this.commandMessage.author;
    }

    public deleteOriginalMessage(): Promise<Message | null> {
        if (!this.commandMessage.deletable) {
            return Promise.resolve(null);
        }

        return this.commandMessage.delete();
    }
}

export default LegacyContext;
