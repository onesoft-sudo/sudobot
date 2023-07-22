import { ClientEvents } from "discord.js";
import { client } from "..";
import Command from "../core/Command";
import { log } from "../utils/logger";

export function CommandGatewayEventListener<K extends keyof ClientEvents>(event: K) {
    return (target: Command, methodName: string, descriptor: TypedPropertyDescriptor<any>) => {
        log(descriptor.value, target, methodName);
        client.on(event, (...args: any[]) => {
            return descriptor.value(client, ...args);
        });
    };
}