import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Logger } from "@framework/log/Logger";
import { Events } from "@framework/types/ClientEvents";
import type { Client } from "discord.js";

class ClientReadyEventListener extends EventListener<Events.ClientReady> {
    public override readonly type = Events.ClientReady;

    @Inject()
    private readonly logger!: Logger;

    public override onEvent(client: Client<true>) {
        this.logger.info(`Logged in successfully as: ${client.user.username} (${client.user.id})`);
    }
}

export default ClientReadyEventListener;
