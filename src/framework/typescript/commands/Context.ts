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

import type { GuildConfig } from "@main/schemas/GuildConfigSchema";
import type { SystemConfig } from "@main/schemas/SystemConfigSchema";
import type {
    APIEmbed,
    Attachment,
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
    EmbedBuilder,
    Guild,
    GuildMember,
    GuildTextBasedChannel,
    InteractionDeferReplyOptions,
    InteractionReplyOptions,
    MessageContextMenuCommandInteraction,
    MessageCreateOptions,
    Snowflake,
    User,
    UserContextMenuCommandInteraction
} from "discord.js";
import { Collection, Message } from "discord.js";
import { emoji } from "../../../main/typescript/utils/emoji";
import Application from "../app/Application";
import type { AnyCommand, Command, CommandMessage } from "./Command";
import { ContextType } from "./ContextType";
import type InteractionContext from "./InteractionContext";
import type LegacyContext from "./LegacyContext";

export type ContextOf<T extends Command<ContextType>> =
    T extends Command<infer U>
        ?
              | (U extends ContextType.Legacy ? LegacyContext : never)
              | (U extends
                    | ContextType.ChatInput
                    | ContextType.MessageContextMenu
                    | ContextType.UserContextMenu
                    ? InteractionContext
                    : never)
        : never;
export type AnyContext = ContextOf<AnyCommand>;

abstract class Context<T extends CommandMessage = CommandMessage> {
    public readonly commandName: string;
    public readonly commandMessage: T;
    public abstract readonly type: ContextType;

    public constructor(commandName: string, commandMessage: T) {
        this.commandName = commandName;
        this.commandMessage = commandMessage;
    }

    public get guildId(): Snowflake {
        return this.commandMessage.guildId!;
    }

    public get guild(): Guild {
        return this.commandMessage.guild!;
    }

    public get channelId(): Snowflake {
        return this.commandMessage.channelId;
    }

    public get channel(): GuildTextBasedChannel {
        return this.commandMessage.channel! as GuildTextBasedChannel;
    }

    public get member(): GuildMember | null {
        return this.commandMessage.member as GuildMember | null;
    }

    public get memberId(): Snowflake | null {
        return this.member?.id ?? null;
    }

    public get config(): GuildConfig | undefined {
        return Application.current().service("configManager").config[this.guildId];
    }

    public get systemConfig(): SystemConfig {
        return Application.current().service("configManager").systemConfig;
    }

    public abstract get userId(): Snowflake;

    public abstract get user(): User;

    public get attachments(): Collection<Snowflake, Attachment> {
        return this.commandMessage instanceof Message
            ? this.commandMessage.attachments
            : new Collection();
    }

    public isLegacy(): this is LegacyContext {
        return this.type === ContextType.Legacy;
    }

    public isChatInput(): this is InteractionContext<ChatInputCommandInteraction> {
        return this.type === ContextType.ChatInput;
    }

    public isContextMenu(): this is InteractionContext<ContextMenuCommandInteraction> {
        return (
            this.type === ContextType.MessageContextMenu ||
            this.type === ContextType.UserContextMenu
        );
    }

    public isMessageContextMenu(): this is InteractionContext<MessageContextMenuCommandInteraction> {
        return this.type === ContextType.MessageContextMenu;
    }

    public isUserContextMenu(): this is InteractionContext<UserContextMenuCommandInteraction> {
        return this.type === ContextType.UserContextMenu;
    }

    public reply(options: Parameters<this["commandMessage"]["reply"]>[0]): Promise<Message> {
        const optionsToPass = options as unknown as MessageCreateOptions & InteractionReplyOptions;

        if (this.commandMessage instanceof Message) {
            return this.commandMessage.reply(optionsToPass);
        }

        if (this.commandMessage.deferred) {
            return this.commandMessage.editReply(optionsToPass);
        }

        return this.commandMessage.reply(
            typeof optionsToPass === "string"
                ? {
                      content: optionsToPass,
                      fetchReply: true
                  }
                : {
                      ...optionsToPass,
                      fetchReply: true
                  }
        );
    }

    public replyEmbed(...embeds: Array<APIEmbed | EmbedBuilder>) {
        return this.reply({ embeds });
    }

    public async defer(options?: InteractionDeferReplyOptions) {
        if (this.commandMessage instanceof Message) {
            return;
        }

        return this.commandMessage.deferReply(options);
    }

    public emoji(name: string) {
        return emoji(Application.current(), name);
    }

    public async error(options: Parameters<this["commandMessage"]["reply"]>[0]) {
        return this.reply(
            typeof options === "string"
                ? `${this.emoji("error") ?? ""} ${options}`
                : {
                      ...(options as unknown as MessageCreateOptions & InteractionReplyOptions),
                      ephemeral: true,
                      content: `${this.emoji("error")} ${
                          (options as MessageCreateOptions).content ?? "An error has occurred."
                      }`
                  }
        );
    }

    public async success(options: Parameters<this["commandMessage"]["reply"]>[0]) {
        const args =
            typeof options === "string"
                ? `${this.emoji("check") ?? ""} ${options}`
                : {
                      ...(options as unknown as MessageCreateOptions & InteractionReplyOptions),
                      ephemeral: true,
                      content: `${this.emoji("check")} ${
                          (options as MessageCreateOptions).content ?? "Operation successful."
                      }`
                  };
        return this.reply(args);
    }
}

export default Context;
