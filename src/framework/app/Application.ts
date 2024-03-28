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

import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { developmentMode } from "../../utils/utils";
import BaseClient from "../client/BaseClient";
import Container from "../container/Container";
import { KernelInterface } from "../core/KernelInterface";
import DynamicLoader from "../import/DynamicLoader";
import { Logger } from "../log/Logger";
import { Service } from "../services/Service";
import { ServiceManager, ServiceName } from "../services/ServiceManager";

class Application {
    public static readonly KEY = "application";
    public readonly container: Container;

    private _client?: BaseClient;
    private _logger?: Logger;
    private _metadata?: Record<string, unknown>;

    public readonly prisma = new PrismaClient({
        errorFormat: "pretty",
        log: developmentMode() ? ["error", "info", "query", "warn"] : ["error", "info", "warn"]
    });

    public readonly dynamicLoader = new DynamicLoader(this);
    public readonly serviceManager = new ServiceManager(this);

    public constructor(protected readonly rootPath: string) {
        this.container = Container.getInstance();
    }

    public static current() {
        return Container.getInstance().resolve<typeof Application>(Application.KEY);
    }

    public get metadata() {
        if (!this._metadata) {
            throw new Error("Metadata is not available");
        }

        return this._metadata;
    }

    public setMetadata(metadata: Record<string, unknown>) {
        this._metadata = metadata;
        return this;
    }

    public setClient(client: BaseClient) {
        this._client = client;
        return this;
    }

    public getClient() {
        if (!this._client) {
            throw new Error("Client is not available");
        }

        return this._client;
    }

    public setLogger(logger: Logger) {
        this._logger = logger;
        return this;
    }

    public getLogger() {
        if (!this._logger) {
            throw new Error("Logger is not available");
        }

        return this._logger;
    }

    public get logger() {
        return this.getLogger();
    }

    public get client() {
        return this.getClient();
    }

    public async boot({
        commands = true,
        events = true,
        permissions = true,
        queues = true
    }: { commands?: boolean; events?: boolean; permissions?: boolean; queues?: boolean } = {}) {
        await this.serviceManager.loadServices();

        if (permissions) {
            await this.dynamicLoader.loadPermissions(path.resolve(this.rootPath, "permissions"));
        }

        if (events) {
            this.getClient().setMaxListeners(50);
            await this.dynamicLoader.loadEvents(path.resolve(this.rootPath, "events"));
        }

        if (commands) {
            await this.dynamicLoader.loadCommands(path.resolve(this.rootPath, "commands"));
        }

        if (queues) {
            await this.dynamicLoader.loadQueueClasses(path.resolve(this.rootPath, "queues"));
        }
    }

    public async run(kernel: KernelInterface) {
        kernel.setApplication(this);
        await kernel.boot();

        if (!this._client) {
            throw new Error("Kernel did not set the client");
        }

        return this;
    }

    public static setupGlobals() {
        global.bootDate = Date.now();

        if (!Symbol.metadata) {
            (Symbol as unknown as Record<string, symbol>).metadata ??= Symbol("metadata");
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getService<S extends new (...args: any[]) => Service>(
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

    public getServiceByName<N extends ServiceName>(name: N, error = true): ServiceRecord[N] {
        const service = this.serviceManager.getServiceByName(name);

        if (!service && error) {
            throw new Error(`Service ${name} not found`);
        }

        return service;
    }
}

export default Application;
