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

import { ChatInputCommandInteraction, Message } from "discord.js";
import Service from "../core/Service";
import { Config } from "./ConfigManager";

export const name = "commandManager";

export interface CommandContext {
    isLegacy: boolean;
    config: Config;
}

export interface LegacyCommandContext extends CommandContext {
    isLegacy: true;
    argv: string[];
    args: string[];
    parsedArgs: any[];
    parsedNamedArgs: Record<string, any>;
    has(arg: string): boolean;
}

export interface ChatInputCommandContext extends CommandContext {
    isLegacy: false;
    options: ChatInputCommandInteraction["options"];
}

export default class CommandManager extends Service {
    public async runCommandFromMessage(message: Message) {
        if (!message.content)
            throw new Error("Invalid message content");

        const config = this.client.configManager.config[message.guildId!];

        if (!config) {
            console.log("This guild is not configured: ", message.guildId!);
            return;
        }

        const commandText = message.content.substring(config.prefix.length);
        const [commandName, ...commandArguments] = commandText
            .split(/ +/);

        const command = this.client.commands.get(commandName);

        if (!command) {
            return false;
        }

        command.run(message, <LegacyCommandContext>{
            isLegacy: true,
            argv: [commandName, ...commandArguments],
            args: commandArguments,
            config,
            parsedArgs: [],
            parsedNamedArgs: {},
            has(arg: string) {
                return this.args.includes(arg);
            },
        })
            .then(result => {
                if (result && typeof result === 'object' && "__reply" in result && result.__reply === true) {
                    message.reply(result as any).catch(console.error);
                }
            })
            .catch(console.error);

        return true;
    }

    public async runCommandFromChatInputCommandInteraction(interaction: ChatInputCommandInteraction) {
        const config = this.client.configManager.config[interaction.guildId!];

        if (!config) {
            return;
        }

        const { commandName } = interaction;
        const command = this.client.commands.get(commandName);

        if (!command) {
            return false;
        }

        command.run(interaction, {
            isLegacy: false,
            config,
            options: interaction.options
        })
            .then(result => {
                if (result && typeof result === 'object' && "__reply" in result && result.__reply === true) {
                    interaction.reply(result as any).catch(console.error);
                }
            })
            .catch(console.error);
    }
}