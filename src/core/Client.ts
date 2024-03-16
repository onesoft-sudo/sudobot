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
import { ClientOptions } from "discord.js";
import path from "node:path";
import metadata from "../../package.json";
import BaseClient from "../framework/client/BaseClient";
import { Inject } from "../framework/container/Inject";
import DynamicLoader from "../framework/import/DynamicLoader";
import { Logger } from "../framework/log/Logger";
import { Service } from "../framework/services/Service";
import { ServiceManager } from "../framework/services/ServiceManager";
import { developmentMode } from "../utils/utils";

class Client<R extends boolean = boolean> extends BaseClient<R> {
    public readonly dynamicLoader = new DynamicLoader(this);
    public readonly serviceManager = new ServiceManager(this);

    @Inject()
    public readonly logger!: Logger;

    public readonly prisma = new PrismaClient({
        errorFormat: "pretty",
        log: developmentMode() ? ["error", "info", "query", "warn"] : ["error", "info", "warn"]
    });

    public static instance: Client;

    public constructor(options: ClientOptions) {
        super(options);
        Client.instance = this;
    }

    public static get logger() {
        return Client.instance.logger;
    }

    public get metadata() {
        return metadata;
    }

    async boot({ commands = true, events = true }: { commands?: boolean; events?: boolean } = {}) {
        await this.serviceManager.loadServices();

        if (events) {
            this.setMaxListeners(50);
            await this.dynamicLoader.loadEvents(path.resolve(__dirname, "../events"));
        }

        if (commands) {
            await this.dynamicLoader.loadCommands(path.resolve(__dirname, "../commands"));
        }
    }

    async getHomeGuild() {
        return (
            this.guilds.cache.get(process.env.HOME_GUILD_ID) ??
            (await this.guilds.fetch(process.env.HOME_GUILD_ID))
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getService<S extends new (...args: any[]) => Service>(
        serviceClass: S,
        error = true
    ): InstanceType<S> {
        const service = this.serviceManager.getService(
            serviceClass as unknown as new () => Service
        ) as InstanceType<S>;

        if (!service && error) {
            throw new Error(`Service ${serviceClass.name} not found`);
        }

        return service;
    }
}

export default Client;
