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
import { Inject } from "../components/container/Inject";
import { Logger } from "../components/log/Logger";
import { developmentMode } from "../utils/utils";

class Client<R extends boolean = boolean> extends DiscordJSClient<R> {
    public readonly prisma = new PrismaClient({
        errorFormat: "pretty",
        log: developmentMode() ? ["error", "info", "query", "warn"] : ["error", "info", "warn"]
    });

    public static instance: Client;

    @Inject()
    public readonly logger!: Logger;

    // FIXME: Use DI for Services

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

    constructor(options: ClientOptions) {
        super(options);
        Client.instance = this;
    }

    async boot({ commands = true, events = true }: { commands?: boolean; events?: boolean } = {}) {
        // await this.serviceManager.loadServices();
        // if (events) {
        //     this.setMaxListeners(50);
        //     await this.dynamicLoader.loadEvents();
        // }
        // if (commands) {
        //     await this.dynamicLoader.loadCommands();
        // }
    }

    async getHomeGuild() {
        return (
            this.guilds.cache.get(process.env.HOME_GUILD_ID) ??
            (await this.guilds.fetch(process.env.HOME_GUILD_ID))
        );
    }
}

export default Client;
