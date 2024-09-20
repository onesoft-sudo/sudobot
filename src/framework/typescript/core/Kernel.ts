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

import type { Awaitable } from "discord.js";
import type Application from "../app/Application";
import { Logger } from "../log/Logger";
import type { KernelInterface } from "./KernelInterface";

export default abstract class Kernel implements KernelInterface {
    protected readonly logger = new Logger("kernel", true);
    private application?: Application;
    public abstract boot(): Awaitable<void>;

    public setApplication(application: Application): void {
        this.application = application;
    }

    public getApplication() {
        if (!this.application) {
            throw new Error("Application not set on kernel");
        }

        return this.application;
    }
}
