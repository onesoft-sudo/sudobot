import type { Awaitable } from "discord.js";
import MessageBus, { type MessageBusRequest, type MessageDetails } from "./MessageBus";
import { Redis } from "ioredis";
import { encode, decode } from "@msgpack/msgpack";
import EventEmitter from "events";
import { promiseWithResolvers } from "@framework/polyfills/Promise";
import { v4 as uuid } from "uuid";

class RedisMessageBus extends MessageBus {
    private readonly subscriber: Redis;
    private readonly publisher: Redis;

    private readonly emitter = new EventEmitter();
    private _nextRequestId: number = 0;
    private readonly responseCallbacks = new Map<number, (data: unknown) => void>();
    private requestHandler?: (request: MessageBusRequest) => unknown;
    private readonly busId = uuid();

    public constructor(url: string) {
        super();

        this.subscriber = new Redis(url);
        this.publisher = new Redis(url);

        this.subscriber.on("messageBuffer", async (channel, message) => {
            try {
                const data = decode(message);
                const channelName = channel.toString("utf-8");

                if (channelName === "requests") {
                    await this.handleRequest(data);
                    return;
                }

                if (channelName === "responses") {
                    this.handleResponse(data);
                    return;
                }

                this.emitter.emit(channelName, { data });
            } catch (error) {
                console.error(error);
                this.emit("error", error);
            }
        });
    }

    public override async enableRequestResponse() {
        await this.subscriber.subscribe("requests", "responses");
    }

    public override publish(channel: string, data: unknown): Promise<number> {
        return this.publisher.publish(channel, Buffer.from(encode(data)));
    }

    public override async subscribe(channel: string, callback: (message: MessageDetails) => Awaitable<void>) {
        try {
            await this.subscriber.subscribe(channel);
            this.emitter.on(channel, callback);
        } catch (error) {
            console.error(error);
            this.emit("error", error);
        }
    }

    public override async request<T>(data: unknown): Promise<T> {
        const id = this._nextRequestId++;

        const { promise, resolve, reject } = promiseWithResolvers<T>();
        this.responseCallbacks.set(id, resolve as (data: unknown) => void);

        setTimeout(() => {
            this.responseCallbacks.delete(id);
            reject(new Error("Request timed out"));
        }, 30_000);

        await this.publish("requests", {
            requestId: id,
            payload: data,
            busId: this.busId
        });

        return promise;
    }

    public override setRequestHandler(callback: (request: MessageBusRequest) => unknown) {
        this.requestHandler = callback;
    }

    private handleResponse(data: unknown) {
        if (
            data &&
            typeof data === "object" &&
            "requestId" in data &&
            typeof data.requestId === "number" &&
            "payload" in data &&
            "busId" in data &&
            data.busId !== this.busId
        ) {
            const resolve = this.responseCallbacks.get(data.requestId);

            if (resolve) {
                resolve(data.payload);
            }
        }
    }

    private async handleRequest(data: unknown) {
        if (
            data &&
            typeof data === "object" &&
            "requestId" in data &&
            typeof data.requestId === "number" &&
            "payload" in data &&
            "busId" in data &&
            data.busId !== this.busId
        ) {
            if (!this.requestHandler) {
                return;
            }

            const responseData = await this.requestHandler?.({
                id: data.requestId,
                payload: data.payload
            });

            await this.publish("responses", {
                requestId: data.requestId,
                payload: responseData,
                busId: this.busId
            });
        }
    }
}

export default RedisMessageBus;
