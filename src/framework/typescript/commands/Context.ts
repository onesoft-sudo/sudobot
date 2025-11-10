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

import type Application from "@framework/app/Application";
import { emoji } from "@framework/utils/emoji";
import {
    type ChatInputCommandInteraction,
    type ContextMenuCommandInteraction,
    type InteractionEditReplyOptions,
    type InteractionReplyOptions,
    Message,
    type MessageCreateOptions
} from "discord.js";
import CommandContextType from "./CommandContextType";
import type InteractionContext from "./InteractionContext";
import type LegacyContext from "./LegacyContext";

export type ContextReplyOptions = InteractionReplyOptions | InteractionEditReplyOptions | MessageCreateOptions | string;

abstract class Context<T extends CommandContextType = CommandContextType, G extends boolean = boolean> {
    public abstract readonly type: T;
    public abstract commandMessage: ChatInputCommandInteraction | ContextMenuCommandInteraction | Message<G>;
    public abstract commandName: string;
    public readonly application: Application;

    public constructor(application: Application) {
        this.application = application;
    }

    public abstract reply(options: ContextReplyOptions): Promise<Message<boolean>>;

    public isLegacy(): this is LegacyContext {
        return this.type === CommandContextType.Legacy;
    }

    public isInteractive(): this is InteractionContext {
        return this.type === CommandContextType.Interactive;
    }

    public get member() {
        return this.commandMessage.member;
    }

    public get user() {
        return this.commandMessage instanceof Message ? this.commandMessage.author : this.commandMessage.user;
    }

    public get guild() {
        return this.commandMessage.guild;
    }

    public emoji(name: string) {
        return emoji(this.application, name);
    }

    public error(options: ContextReplyOptions): Promise<Message<boolean>> {
        const newOptions =
            typeof options === "string"
                ? {
                      content: `${emoji(this.application, "error")} ${options}`
                  }
                : {
                      ...options,
                      content: `${emoji(this.application, "error")} ${options.content}`
                  };

        return this.reply(newOptions);
    }

    public success(options: ContextReplyOptions): Promise<Message<boolean>> {
        const newOptions =
            typeof options === "string"
                ? {
                      content: `${emoji(this.application, "check")} ${options}`
                  }
                : {
                      ...options,
                      content: `${emoji(this.application, "check")} ${options.content}`
                  };

        return this.reply(newOptions);
    }

    public inGuild(): this is Context<T, true> {
        return this.commandMessage.inGuild();
    }
}

export default Context;
