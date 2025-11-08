import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Logger } from "@framework/log/Logger";
import { Events } from "@framework/types/ClientEvents";
import type { Awaitable } from "discord.js";

class ShardReadyEventListener extends EventListener<Events.ShardReady> {
    public override readonly type = Events.ShardReady;

    @Inject()
    private readonly logger!: Logger;

    public override onEvent(shardId: number, unavailableGuilds: Set<string> | undefined): Awaitable<void> {
        this.logger.info(`Shard ${shardId} is ready, total unavailable guilds: ${unavailableGuilds?.size ?? 0}`);
    }
}

export default ShardReadyEventListener;
