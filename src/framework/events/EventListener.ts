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

import Client from "../../core/Client";
import CanBind from "../container/CanBind";
import { ClientEvents } from "../types/ClientEvents";

@CanBind
export default abstract class EventListener<
    K extends keyof ClientEvents | string = keyof ClientEvents
> {
    public abstract readonly name: K;

    constructor(protected client: Client) {}

    abstract execute(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: K extends keyof ClientEvents ? ClientEvents[K] : any[]
    ): Promise<unknown> | void;
}
