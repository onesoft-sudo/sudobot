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

import type { PromiseResolver } from "@framework/polyfills/Promise.js";
import { decode, encode } from "@msgpack/msgpack";
import type { Awaitable } from "discord.js";
import EventEmitter from "events";
import type { RedisOptions } from "ioredis";
import { Redis } from "ioredis";
import type { IPCRequest, IPCRequestOptions, IPCResponse, MessageBusOptions } from "./MessageBus.js";
import MessageBus, { type MessageDetails } from "./MessageBus.js";

export type RedisMessageBusOptions = MessageBusOptions & {
    url: string;
    redisOptions?: RedisOptions;
};

export enum RedisMessageBusRequestChannelPrefix {
    Request = "--request-",
    Response = "--response-"
}

type RequestQueueEntry = {
    resolver: PromiseResolver<IPCResponse<unknown>>;
    timeout: NodeJS.Timeout;
};

class RedisMessageBus extends MessageBus {
    private readonly subscriber: Redis;
    private readonly publisher: Redis;

    private readonly emitter = new EventEmitter();
    private readonly requestQueue = new Map<number, RequestQueueEntry>();
    private nextRequestId = 0;

    public constructor(options: RedisMessageBusOptions) {
        super(options);

        const { url, redisOptions = {} } = options;

        this.subscriber = new Redis(url, redisOptions);
        this.publisher = new Redis(url, redisOptions);

        this.subscriber.on("error", error => {
            if (process.env.NODE_ENV === "production") {
                throw error;
            }

            if (process.env.NODE_ENV === "test") {
                return;
            }

            console.error(error);
        });

        this.publisher.on("error", error => {
            if (process.env.NODE_ENV === "production") {
                throw error;
            }

            if (process.env.NODE_ENV === "test") {
                return;
            }

            console.error(error);
        });

        this.subscriber.on("messageBuffer", async (channel, message) => {
            try {
                const channelName = channel.toString("utf-8");
                const data = decode(message);

                if (channelName.startsWith("--")) {
                    await this.handleSubscriberSpecialMessage(channelName, data);
                    return;
                }

                this.emitter.emit(channelName, {
                    data
                } satisfies MessageDetails<unknown>);
            } catch (error) {
                console.error(error);
                this.emit("error", error);
            }
        });
    }

    private async handleSubscriberSpecialMessage(channelName: string, data: unknown) {
        try {
            if (channelName.startsWith(RedisMessageBusRequestChannelPrefix.Request)) {
                const request = data as IPCRequest<unknown>;

                if (typeof request.sourceBusId !== "string") {
                    return;
                }

                const [error, response] = await this.invokeRequestHandler(request);

                await this.publish(
                    `${RedisMessageBusRequestChannelPrefix.Response}${request.sourceBusId}`,
                    error ?? response
                );
            } else if (channelName.startsWith(RedisMessageBusRequestChannelPrefix.Response)) {
                const response = data as IPCResponse<unknown>;

                if (typeof response.sourceBusId !== "string") {
                    return;
                }

                const queueEntry = this.requestQueue.get(response.requestId);

                if (!queueEntry) {
                    return;
                }

                this.requestQueue.delete(response.requestId);
                clearTimeout(queueEntry.timeout);
                queueEntry.resolver(response);
            }
        } catch (error) {
            this.emit("error", error);
        }
    }

    public override async initialize() {
        for (const busId of this.busIds) {
            await this.subscribe(`${RedisMessageBusRequestChannelPrefix.Request}${busId}`);
            await this.subscribe(`${RedisMessageBusRequestChannelPrefix.Response}${busId}`);
        }
    }

    public override async publish(channel: string, data: unknown): Promise<void> {
        try {
            await this.publisher.publish(channel, Buffer.from(encode(data)));
        } catch (error) {
            this.emit("error", error);
        }
    }

    public override async subscribe<T>(channel: string, callback?: (message: MessageDetails<T>) => Awaitable<void>) {
        try {
            await this.subscriber.subscribe(channel);

            if (callback) {
                this.emitter.on(channel, callback);
            }
        } catch (error) {
            this.emit("error", error);
        }
    }

    public override async unsubscribe<T>(
        channel: string,
        callback?: (message: MessageDetails<T>) => Awaitable<void>
    ): Promise<void> {
        if (!callback) {
            this.emitter.removeAllListeners(channel);
            await this.subscriber.unsubscribe(channel);
            return;
        }

        this.emitter.off(channel, callback);

        if (!this.emitter.listenerCount(channel)) {
            await this.subscriber.unsubscribe(channel);
        }
    }

    public override async request<T, R>(
        targetBusId: string,
        resourceId: string,
        options?: IPCRequestOptions<T>
    ): Promise<IPCResponse<R>> {
        const { promise, reject, resolve } = Promise.withResolvers<IPCResponse<R>>();
        const requestId = this.nextRequestId++;

        const timeout = setTimeout(() => {
            this.requestQueue.delete(requestId);
            reject(new Error(`Request to bus ${targetBusId} at resource ${resourceId} timed out`));
        }, options?.timeout ?? this.defaultRequestTimeout);

        this.requestQueue.set(requestId, { resolver: resolve as PromiseResolver<unknown>, timeout });

        await this.publish(`${RedisMessageBusRequestChannelPrefix.Request}${targetBusId}`, {
            id: requestId,
            sourceBusId: this.canonicalBusId,
            targetResourceId: resourceId,
            payload: options?.payload,
            targetBusId
        } satisfies IPCRequest<T>);

        return promise;
    }
}

export default RedisMessageBus;
