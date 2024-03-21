/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import { Collection, Message } from "discord.js";
import { Command } from "../framework/commands/Command";
import CommandAbortedError from "../framework/commands/CommandAbortedError";
import LegacyContext from "../framework/commands/LegacyContext";
import { Inject } from "../framework/container/Inject";
import { Name } from "../framework/services/Name";
import { Service } from "../framework/services/Service";
import type ConfigurationManager from "./ConfigurationManager";

@Name("commandManager")
class CommandManager extends Service {
    public readonly commands = new Collection<string, Command>();

    @Inject("configManager")
    protected readonly configManager!: ConfigurationManager;

    public async addCommand(
        command: Command,
        loadMetadata = true,
        groups: Record<string, string> | null = null,
        defaultGroup = "default"
    ) {
        const previousCommand = this.commands.get(command.name);
        let aliasGroupSet = false;

        if (loadMetadata && previousCommand) {
            await this.application.dynamicLoader.unloadEventsFromMetadata(previousCommand);
        }

        this.commands.set(command.name, command);

        for (const alias of command.aliases) {
            this.commands.set(alias, command);

            if (groups?.[alias] && !aliasGroupSet) {
                command.group = groups?.[alias];
                aliasGroupSet = true;
            }
        }

        if (!aliasGroupSet || groups?.[command.name]) {
            command.group = groups?.[command.name] ?? defaultGroup;
        }

        if (loadMetadata) {
            await this.application.dynamicLoader.loadEventsFromMetadata(command);
        }
    }

    public async runCommandFromMessage(message: Message<true>) {
        const config = this.configManager.config[message.guildId!];

        if (!config) {
            return;
        }

        const prefixes = [
            config.prefix,
            `<@${this.application.getClient().user!.id}>`,
            `<@!${this.application.getClient().user!.id}>`
        ];
        let foundPrefix;

        prefixCheck: for (const prefix of prefixes) {
            if (message.content.startsWith(prefix)) {
                foundPrefix = prefix;
                break prefixCheck;
            }
        }

        if (!foundPrefix) {
            return;
        }

        const content = message.content.slice(foundPrefix.length).trim();
        const argv = content.split(/ +/);
        const [commandName, ...args] = argv;
        const command = this.commands.get(commandName);

        if (!command || !command.supportsLegacy()) {
            return false;
        }

        const context = new LegacyContext(commandName, content, message, args, argv);

        try {
            await command.run(context);
        } catch (error) {
            if (error instanceof CommandAbortedError) {
                await error.sendMessage(context);
                return;
            }

            this.application.logger.error(error);
        }
    }
}

export default CommandManager;
