import type { Awaitable } from "discord.js";
import MessageBus, { type MessageBusRequest, type MessageDetails } from "./MessageBus";
import { Redis } from "ioredis";
import { encode, decode } from "@msgpack/msgpack";
import EventEmitter from "events";
import { promiseWithResolvers } from "@framework/polyfills/Promise";

class RedisMessageBus extends MessageBus {
    private readonly subscriber: Redis;
    private readonly publisher: Redis;

    private readonly emitter = new EventEmitter();
    private _nextRequestId: number = 0;
    private readonly responseControls = new Map<number, { callback: (data: unknown) => void; timeout: Timer }>();
    private requestHandler?: (request: MessageBusRequest) => unknown;
    private readonly busId: string;

    public constructor(url: string, busId = Date.now().toString()) {
        super();

        this.busId = busId;
        this.subscriber = new Redis(url);
        this.publisher = new Redis(url);

        this.subscriber.on("messageBuffer", async (channel, message) => {
            try {
                const data = decode(message);
                const channelName = channel.toString("utf-8");

                if (channelName.startsWith("request_")) {
                    await this.handleRequest(data);
                    return;
                }

                if (channelName.startsWith("response_")) {
                    this.handleResponse(data);
                    return;
                }

                this.emitter.emit(channelName, { data } satisfies MessageDetails);
            } catch (error) {
                console.error(error);
                this.emit("error", error);
            }
        });
    }

    public override async enableRequestResponse() {
        await this.subscriber.subscribe(`request_${this.busId}`, `response_${this.busId}`);
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

    public override async request<T>(toBusId: string, data: unknown): Promise<T> {
        const id = this._nextRequestId++;
        const { promise, resolve, reject } = promiseWithResolvers<T>();

        this.responseControls.set(id, {
            callback: resolve as (data: unknown) => void,
            timeout: setTimeout(() => {
                if (this.responseControls.delete(id)) {
                    reject(new Error("Request timed out"));
                }
            }, 30_000)
        });

        await this.publish(`request_${toBusId}`, {
            requestId: id,
            payload: data,
            fromBusId: this.busId
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
            "fromBusId" in data &&
            data.fromBusId !== this.busId
        ) {
            const control = this.responseControls.get(data.requestId);

            if (control) {
                clearTimeout(control.timeout);
                control.callback(data.payload);
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
            "fromBusId" in data &&
            data.fromBusId !== this.busId
        ) {
            if (!this.requestHandler) {
                return;
            }

            const responseData = await this.requestHandler?.({
                id: data.requestId,
                payload: data.payload,
                fromBusId: this.busId
            });

            await this.publish(`response_${data.fromBusId}`, {
                requestId: data.requestId,
                payload: responseData,
                fromBusId: this.busId
            });
        }
    }
}

export default RedisMessageBus;
