import { ClientEvents } from "discord.js";

export function CommandGatewayEventListener(event: keyof ClientEvents) {
    return (target: Object, methodName: string, descriptor: TypedPropertyDescriptor<any>) => {
        const metadata = Reflect.getMetadata("event_listeners", target) ?? [];

        metadata.push({
            event,
            handler: descriptor.value,
            methodName
        });

        Reflect.defineMetadata("event_listeners", metadata, target);
    };
}
