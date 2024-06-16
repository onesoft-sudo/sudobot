import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import type ReactionRoleService from "@main/services/ReactionRoleService";
import type { RawMessageReactionData } from "@main/services/ReactionRoleService";

class RawEventListener extends EventListener<Events.Raw> {
    public override readonly name = Events.Raw;

    @Inject("reactionRoleService")
    protected readonly reactionRoleService!: ReactionRoleService;

    public override async execute(data: { t: string; d: unknown }): Promise<void> {
        await this.reactionRoleService.onRaw(data as RawMessageReactionData);
    }
}

export default RawEventListener;
