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

import type Client from "../../core/Client";
import Container from "../container/Container";
import { KernelInterface } from "../core/KernelInterface";

class Application {
    public static readonly KEY = "application";
    public readonly container: Container;
    private client?: Client;

    public constructor() {
        this.container = Container.getInstance();
        this.container.bind(Application, {
            singleton: true,
            factory: () => this,
            key: Application.KEY
        });
    }

    public setClient(client: Client) {
        this.client = client;
        return this;
    }

    public getClient() {
        if (!this.client) {
            throw new Error("Client is not available");
        }

        return this.client;
    }

    public async run(kernel: KernelInterface) {
        kernel.setApplication(this);
        await kernel.boot();

        if (!this.client) {
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
}

export default Application;
