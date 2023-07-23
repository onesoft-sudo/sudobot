import { ClientEvents } from "discord.js";
import Command from "../core/Command";

export function CommandGatewayEventListener<K extends keyof ClientEvents>(event: K) {
    return (target: Command, methodName: string, descriptor: TypedPropertyDescriptor<any>) => {
        const metadata = Reflect.getMetadata("event_listeners", target) ?? [];

        metadata.push({
            event,
            handler: descriptor.value
        });

        Reflect.defineMetadata("event_listeners", metadata, target);
    };
}
