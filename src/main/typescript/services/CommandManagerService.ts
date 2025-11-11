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

import Command from "@framework/commands/Command";
import { Inject } from "@framework/container/Inject";
import Service from "@framework/services/Service";
import { ChatInputCommandInteraction, Collection, ContextMenuCommandInteraction, Message } from "discord.js";
import ConfigurationManagerService, { ConfigurationType } from "./ConfigurationManagerService";
import CommandContextType from "@framework/commands/CommandContextType";
import LegacyContext from "@framework/commands/LegacyContext";

import InteractionContext from "@framework/commands/InteractionContext";
import { getEnvData } from "@main/env/env";
import { Logger } from "@framework/log/Logger";
import type { HasEventListeners } from "@framework/types/HasEventListeners";
import { isDevelopmentMode } from "@framework/utils/utils";

export const SERVICE_COMMAND_MANAGER = "commandManagerService" as const;

class CommandManagerService extends Service implements HasEventListeners {
    public override readonly name: string = SERVICE_COMMAND_MANAGER;
    public readonly commands = new Collection<string, Command>();

    private readonly logger = Logger.getLogger(CommandManagerService);

    @Inject()
    private readonly configurationManagerService!: ConfigurationManagerService;

    public register(command: Command, group?: string) {
        this.commands.set(command.name, command);

        if (group && !command.group) {
            Object.defineProperty(command, "group", { value: group });
        }

        for (const alias of command.aliases) {
            this.commands.set(alias, command);
        }
    }

    public run(message: Message | ChatInputCommandInteraction | ContextMenuCommandInteraction): Promise<boolean> {
        if (message instanceof Message) {
            return this.runFromMessage(message);
        }

        return this.runFromInteraction(message);
    }

    private async runFromMessage(message: Message): Promise<boolean> {
        const config = await this.configurationManagerService.get(
            message.inGuild() ? ConfigurationType.Guild : ConfigurationType.DirectMessage,
            message.guildId || message.author.id
        );
        const prefix = config.commands?.prefix || "-";

        if (!message.content?.startsWith(prefix)) {
            return false;
        }

        const commandContent = message.content.slice(prefix.length);
        const argv = commandContent.split(/\s+/);
        const [commandName, ...args] = argv;
        const command = this.commands.get(commandName);

        if (!command || !command.contexts.includes(CommandContextType.Legacy)) {
            return false;
        }

        await command.run(new LegacyContext(this.application, message, commandName, commandContent, argv, args));
        return true;
    }

    private async runFromInteraction(
        interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction
    ): Promise<boolean> {
        const command = this.commands.get(interaction.commandName);

        if (!command || !command.contexts.includes(CommandContextType.Legacy)) {
            return false;
        }

        await command.run(new InteractionContext(this.application, interaction));
        return true;
    }

    public async sync({ homeGuild }: SyncOptions): Promise<number> {
        const commands = [];

        for (const [key, command] of this.commands) {
            if (key !== command.name) {
                continue;
            }

            const built = command.build();
            commands.push(...(Array.isArray(built) ? built : [built]).map(c => c.toJSON()));
        }

        if (homeGuild) {
            const guild = this.application.client.guilds.cache.get(getEnvData().SUDOBOT_HOME_GUILD_ID);

            if (!guild) {
                this.logger.debug("Home guild not found, skipping");
                return 0;
            }

            const { size } = await guild.commands.set(commands);
            this.logger.info(`Successfully updated ${size} application guild commands`);
            return size;
        }
        else {
            const application = this.application.client.application;

            if (!application) {
                this.logger.debug("Application not found, skipping");
                return 0;
            }

            const { size } = await application.commands.set(commands);
            this.logger.info(`Successfully updated ${size} application commands`);
            return size;
        }
    }

    public async onClientReady(): Promise<void> {
        const updateMode = globalThis.optionValues.update;
        const isDevMode = isDevelopmentMode();

        if (isDevMode || updateMode) {
            try {
                await this.sync({
                    homeGuild: updateMode ? updateMode === "local" : isDevMode
                });
            } catch (error) {
                this.logger.error(error);
            }
        }
    }
}

export type SyncOptions = {
    homeGuild?: boolean;
};

export default CommandManagerService;
