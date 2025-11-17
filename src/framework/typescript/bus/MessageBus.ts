/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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
import EventEmitter from "events";

type MessageBusEventMap = {
    error: [error: unknown];
};

export type MessageDetails<T = unknown> = {
    data: T;
};

export type MessageBusRequest<T = unknown> = {
    id: number;
    payload: T;
    fromBusId: string;
};

abstract class MessageBus extends EventEmitter<MessageBusEventMap> {
    public abstract subscribe(channel: string, callback: (message: MessageDetails) => Awaitable<void>): void;
    public abstract publish(channel: string, data: unknown): void;
    public abstract setRequestHandler(callback: (request: MessageBusRequest) => unknown): void;
    public abstract request<T>(toBusId: string, data: unknown): Promise<T>;
    public abstract enableRequestResponse(): Promise<void>;
}

export default MessageBus;
