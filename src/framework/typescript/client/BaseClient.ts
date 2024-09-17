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

import type { Awaitable, ClientEvents as DiscordClientEvents } from "discord.js";
import { Client as DiscordJSClient } from "discord.js";
import type EventEmitter from "events";
import type { ClientEvents } from "../types/ClientEvents";

abstract class BaseClient<R extends boolean = boolean> extends DiscordJSClient<R> {
    public static instance: BaseClient;

    public setMaxListenerCount(n: number) {
        return (this as unknown as EventEmitter).setMaxListeners(n);
    }

    public addEventListener<K extends keyof ClientEvents>(
        event: K,
        listener: (...args: ClientEvents[K]) => Awaitable<unknown>
    ) {
        this.on<keyof DiscordClientEvents>(
            event as unknown as keyof DiscordClientEvents,
            listener as unknown as (...args: DiscordClientEvents[keyof DiscordClientEvents]) => void
        );
    }

    public removeEventListener<K extends keyof ClientEvents>(
        event: K,
        listener?: (...args: ClientEvents[K]) => Awaitable<unknown>
    ) {
        this.off<keyof DiscordClientEvents>(
            event as unknown as keyof DiscordClientEvents,
            listener as unknown as (...args: DiscordClientEvents[keyof DiscordClientEvents]) => void
        );
    }
}

export default BaseClient;
