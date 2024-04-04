import { Service } from "../framework/services/Service";
import { ModerationAction } from "../types/ModerationAction";
import { Guild, GuildMember, User } from "discord.js";
import { Inject } from "../framework/container/Inject";
import type InfractionManager from "./InfractionManager";
import { Infraction } from "@prisma/client";
import { TODO } from "../framework/utils/devflow";

type MemberOnlyAction = Extract<ModerationAction, { type: "kick" | "mute" | "clear" }>

type TakeActionResult = {
    failedActions: ModerationAction["type"][];
    infractions: Infraction[];
};

class ModerationActionService extends Service {
    @Inject("infractionManager")
    private readonly infractionManager!: InfractionManager;

    public takeActions(guild: Guild, target: User, actions: ModerationAction[]): Promise<TakeActionResult>;
    public takeActions(guild: Guild, target: GuildMember, actions: MemberOnlyAction[]): Promise<TakeActionResult>;

    public async takeActions(guild: Guild, target: GuildMember | User, actions: ModerationAction[]) {
        member:
        if (target instanceof GuildMember) {
            for (const action of actions) {
                if (!["kick", "mute", "clear"].includes(action.type)) {
                    break member;
                }

                // const result = await this.takeActionOnMember(guild, target, action as MemberOnlyAction);
                // TODO
            }

            return;
        }

        const failedActions: ModerationAction["type"][] = [];
        const infractions: Infraction[] = [];

        for (const action of actions) {
            const result = await this.takeActionOnUser(guild, target instanceof GuildMember ? target.user : target, action);

            if (result?.status !== "success") {
                failedActions.push(action.type);
            }
            else {
                infractions.push(result.infraction);
            }
        }

        return {
            failedActions,
            infractions
        };
    }

    public async takeActionOnMember(_guild: Guild, _target: GuildMember, _action: MemberOnlyAction) {
        TODO();
    }

    private async takeActionOnUser(guild: Guild, target: User, action: ModerationAction) {
        switch (action.type) {
            case "ban":
                return await this.infractionManager.createBan({
                    moderator: this.application.client.user!,
                    user: target,
                    reason: action.reason,
                    deletionTimeframe: action.delete_timeframe,
                    guildId: guild.id,
                    duration: action.duration
                });

            default:
                throw new Error(`Invalid action type: ${action.type}`);
        }
    }
}

export default ModerationActionService;