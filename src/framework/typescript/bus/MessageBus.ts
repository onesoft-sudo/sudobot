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

import { getMessageControllerHandlerList } from "@framework/bus/MessageController.js";
import type { ConstructorOf } from "@framework/container/Container.js";
import { randomBytes } from "crypto";
import { Collection, type Awaitable } from "discord.js";
import EventEmitter from "events";

abstract class MessageBus extends EventEmitter<MessageBusEventMap> {
    protected readonly busOptions: MessageBusOptions;
    protected readonly busIds: string[];
    protected readonly canonicalBusId: string;
    protected readonly handlers = new Collection<string, RequestHandlerDescriptor>();
    protected readonly defaultRequestTimeout: number;

    public constructor(options: MessageBusOptions) {
        super();
        this.busOptions = options;
        this.busIds = !options.busIds || !options.busIds.length ? [randomBytes(32).toHex()] : [...options.busIds];
        this.canonicalBusId = options.canonicalBusId ?? this.busIds[0];
        this.defaultRequestTimeout = options.defaultRequestTimeout ?? 10_000; /* 10seconds */
    }

    public abstract initialize(): Awaitable<void>;
    public abstract subscribe(channel: string): Awaitable<void>;
    public abstract subscribe<T>(
        channel: string,
        callback: (message: MessageDetails<T>) => Awaitable<void>
    ): Awaitable<void>;
    public abstract unsubscribe(channel: string): Awaitable<void>;
    public abstract unsubscribe<T>(
        channel: string,
        callback: (message: MessageDetails<T>) => Awaitable<void>
    ): Awaitable<void>;
    public abstract publish(channel: string, data: unknown): Awaitable<void>;
    public abstract request<T, R>(
        targetBusId: string,
        resourceId: string,
        options?: IPCRequestOptions<T>
    ): Awaitable<IPCResponse<R>>;

    public addRequestHandlerCallback<T, U>(resourceId: string, callback: (request: IPCRequest<T>) => IPCResponse<U>) {
        if (this.handlers.has(resourceId)) {
            throw new Error(`A handler for resource ${resourceId} is already registered`);
        }

        const descriptor: RequestHandlerDescriptor = {
            method: callback as RequestHandlerDescriptor["method"]
        };

        this.handlers.set(resourceId, descriptor);
    }

    public async addRequestHandlerController(controllerClass: ConstructorOf<object>) {
        const metadata = getMessageControllerHandlerList(controllerClass);

        if (metadata === undefined) {
            throw new Error(`Class ${controllerClass.name} does not have @MessageController annotation`);
        }

        for (const { key, resourceId } of metadata) {
            if (this.handlers.has(resourceId)) {
                throw new Error(`A handler for resource ${resourceId} is already registered`);
            }

            const instance =
                (await this.busOptions.factory?.(controllerClass as new (...args: unknown[]) => unknown)) ??
                new (controllerClass as new (bus: MessageBus) => object)(this);

            const descriptor: RequestHandlerDescriptor = {
                method: instance[key as keyof typeof instance],
                controller: instance
            };

            this.handlers.set(resourceId, descriptor);
        }
    }

    protected async invokeRequestHandler(request: IPCRequest<unknown>) {
        const descriptor = this.handlers.get(request.targetResourceId);

        if (!descriptor) {
            return [
                {
                    status: IPCResponseStatus.CLIENT_ERROR,
                    sourceBusId: this.canonicalBusId,
                    requestId: request.id
                } satisfies IPCResponse<void> as IPCResponse<void>,
                null
            ] as const;
        }

        if (descriptor.controller) {
            return [null, await descriptor.method.call(descriptor.controller, request)] as const;
        }

        return [null, await descriptor.method(request)] as const;
    }

    public static response<T>(
        request: IPCRequest<unknown>,
        responseOptions: IPCResponseOptions<T> = {}
    ): IPCResponse<T> {
        return {
            status: responseOptions.status ?? IPCResponseStatus.OK,
            payload: responseOptions.payload,
            requestId: request.id,
            sourceBusId: request.targetBusId
        };
    }
}

type MessageBusEventMap = {
    error: [error: unknown];
};

export type MessageDetails<T> = {
    data: T;
};

export enum IPCResponseStatus {
    OK = 200,
    CLIENT_ERROR = 400,
    SERVER_ERROR = 500
}

export type IPCRequest<T> = {
    id: number;
    sourceBusId: string;
    targetResourceId: string;
    targetBusId: string;
    payload?: T;
};

export type IPCRequestOptions<T> = {
    payload?: T;
    timeout?: number; /* milliseconds */
};

export type IPCResponse<T> = {
    requestId: number;
    sourceBusId: string;
    status: IPCResponseStatus;
    payload?: T;
};

export type IPCResponseOptions<T> = {
    status?: IPCResponseStatus;
    payload?: T;
};

export type MessageBusOptions = {
    busIds?: string[];
    canonicalBusId?: string;
    defaultRequestTimeout?: number;
    factory?: <T>(controllerClass: new (...args: unknown[]) => T) => Awaitable<T>;
};

export type RequestHandlerDescriptor = {
    controller?: object;
    method: (request: IPCRequest<unknown>) => Awaitable<IPCResponse<unknown>>;
};

export default MessageBus;
