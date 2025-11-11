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
