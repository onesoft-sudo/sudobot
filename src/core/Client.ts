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
import { ClientOptions, Client as DiscordJSClient } from "discord.js";
import path from "path";
import Server from "../api/Server";
import { Logger } from "../components/io/Logger";
import type ConfigManager from "../services/ConfigManager";
import type LogServer from "../services/LogServer";
import type StartupManager from "../services/StartupManager";
import { developmentMode } from "../utils/utils";
import DynamicLoader from "./DynamicLoader";
import type Service from "./Service";
import ServiceManager from "./ServiceManager";

class Client<R extends boolean = boolean> extends DiscordJSClient<R> {
    public readonly prisma = new PrismaClient({
        errorFormat: "pretty",
        log: developmentMode() ? ["error", "info", "query", "warn"] : ["error", "info", "warn"]
    });

    public static instance: Client;

    // FIXME: Use DI for Logger
    private static _logger?: Logger;

    public static get logger() {
        if (!this._logger) {
            this._logger = new Logger("system", true);
        }

        return this._logger;
    }

    public get logger() {
        return Client.logger;
    }

    public static getLogger() {
        return this.logger;
    }

    // FIXME: Use DI for Services
    public readonly dynamicLoader = new DynamicLoader(this);
    public readonly serviceManager = new ServiceManager(this);
    public readonly server = new Server(this);

    public readonly aliases = {
        automod: path.resolve(__dirname, "../automod"),
        services: path.resolve(__dirname, "../services")
    };

    public readonly services = [
        "@services/StartupManager",
        "@services/ConfigManager" /* This service is manually booted by the Extension Service. */,
        "@services/ExtensionService",
        "@services/LogServer"
    ];

    startupManager!: StartupManager;
    configManager!: ConfigManager;
    logServer!: LogServer;

    constructor(options: ClientOptions) {
        super(options);
        Client.instance = this;
    }

    getService<S extends Service = Service>(name: string): S {
        return this[name as keyof typeof this] as S;
    }

    async boot({ commands = true, events = true }: { commands?: boolean; events?: boolean } = {}) {
        await this.serviceManager.loadServices();

        if (events) {
            this.setMaxListeners(50);
            await this.dynamicLoader.loadEvents();
        }

        if (commands) {
            await this.dynamicLoader.loadCommands();
        }
    }

    async getHomeGuild() {
        return (
            this.guilds.cache.get(process.env.HOME_GUILD_ID) ??
            (await this.guilds.fetch(process.env.HOME_GUILD_ID))
        );
    }
}

export default Client;
