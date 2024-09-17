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

import type Application from "../app/Application";
import type BaseClient from "../client/BaseClient";
import Container from "../container/Container";
import type { Service } from "../services/Service";
import type { ServiceName } from "../services/ServiceManager";

export const container = () => Container.getInstance();
export const application = () => container().resolve<typeof Application>("application");
export const client = () => container().resolve<typeof BaseClient>("client");

export function service<T extends typeof Service>(ref: T): InstanceType<T>;
export function service<T extends ServiceName>(key: T): ServiceRecord[T];

export function service(refOrName: typeof Service | ServiceName): Service {
    if (typeof refOrName === "string") {
        return application().service(refOrName) as Service;
    } else {
        return application().getService(refOrName as unknown as new () => Service) as Service;
    }
}

export const drizzle = () => application().database.drizzle;

export { application as getApplication, client as getClient, container as getContainer };
