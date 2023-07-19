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

import { PrismaClient } from "@prisma/client";
import { Collection, Client as DiscordClient, UserResolvable, GuildEmoji } from "discord.js";
import fs from "fs/promises";
import path from "path";
import Server from "../api/Server";
import Antispam from "../automod/Antispam";
import MessageFilter from "../automod/MessageFilter";
import CommandManager from "../services/CommandManager";
import ConfigManager from "../services/ConfigManager";
import InfractionManager from "../services/InfractionManager";
import LoggerService from "../services/LoggerService";
import QueueManager from "../services/QueueManager";
import { logError, logInfo } from "../utils/logger";
import Command from "./Command";
import ServiceManager from "./ServiceManager";

export default class Client extends DiscordClient {
    aliases = {
        "@services": path.resolve(__dirname, "../services"),
        "@automod": path.resolve(__dirname, "../automod")
    };

    services = [
        "@services/ConfigManager",
        "@services/CommandManager",
        "@services/InfractionManager",
        "@services/LoggerService",
        "@automod/MessageFilter",
        "@automod/Antispam",
        "@services/QueueManager"
    ];

    commandsDirectory = path.resolve(__dirname, "../commands");
    eventsDirectory = path.resolve(__dirname, "../events");

    serviceManager = new ServiceManager(this);

    configManager: ConfigManager = {} as ConfigManager;
    commandManager: CommandManager = {} as CommandManager;
    infractionManager: InfractionManager = {} as InfractionManager;
    logger: LoggerService = {} as LoggerService;
    messageFilter: MessageFilter = {} as MessageFilter;
    antispam: Antispam = {} as Antispam;
    queueManager: QueueManager = {} as QueueManager;

    prisma = new PrismaClient({
        errorFormat: "pretty",
        log: ["query", "error", "info", "warn"]
    });

    server = new Server(this);

    commands = new Collection<string, Command>();
    emojiMap = new Collection<string, GuildEmoji>;

    async boot() {
        await this.serviceManager.loadServices();
    }

    async fetchUserSafe(user: UserResolvable) {
        try {
            return await this.users.fetch(user);
        } catch (e) {
            logError(e);
            return null;
        }
    }

    async loadCommands(directory = this.commandsDirectory) {
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const isDirectory = (await fs.lstat(filePath)).isDirectory();

            if (isDirectory) {
                await this.loadCommands(filePath);
                continue;
            }

            if (!file.endsWith(".ts") && !file.endsWith(".js")) {
                continue;
            }

            const { default: Command } = await import(filePath);
            const command = new Command(this);
            this.commands.set(command.name, command);

            for (const alias of command.aliases) {
                this.commands.set(alias, command);
            }

            logInfo("Loaded command: ", command.name);
        }
    }

    async loadEvents(directory = this.eventsDirectory) {
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const isDirectory = (await fs.lstat(filePath)).isDirectory();

            if (isDirectory) {
                await this.loadEvents(filePath);
                continue;
            }

            if (!file.endsWith(".ts") && !file.endsWith(".js")) {
                continue;
            }

            const { default: Event } = await import(filePath);
            const event = new Event(this);
            this.on(event.name, event.execute.bind(event));
        }
    }

    async getHomeGuild() {
        const id = process.env.HOME_GUILD_ID;

        if (!id) {
            logError("Environment variable `HOME_GUILD_ID` is not set. The bot can't work without it. Please follow the setup guide in the bot documentation.");
            process.exit(-1);
        }

        try {
            return this.guilds.cache.get(id) || (await this.guilds.fetch(id));
        }
        catch (e) {
            logError(e);
            logError("Error fetching home guild: make sure the ID inside `HOME_GUILD_ID` environment variable is correct.");
            process.exit(-1);
        }
    }
}
