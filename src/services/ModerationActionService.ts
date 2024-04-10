import { Infraction } from "@prisma/client";
import { Guild, GuildMember, Message, TextChannel, User } from "discord.js";
import { Inject } from "../framework/container/Inject";
import { Name } from "../framework/services/Name";
import { Service } from "../framework/services/Service";
import { ModerationAction } from "../types/ModerationAction";
import type InfractionManager from "./InfractionManager";

type MemberOnlyAction = Extract<ModerationAction, { type: "kick" | "mute" | "role" | "warn" }>;

type TakeActionResult = {
    failedActions: ModerationAction["type"][];
    infractions: Infraction[];
};

type TakeActionPayload = {
    channel?: TextChannel;
    message?: Message;
};

@Name("moderationActionService")
class ModerationActionService extends Service {
    @Inject("infractionManager")
    private readonly infractionManager!: InfractionManager;

    public async takeActions(
        guild: Guild,
        target: GuildMember | User,
        actions: ModerationAction[],
        payload: TakeActionPayload = {}
    ): Promise<TakeActionResult> {
        const failedActions: ModerationAction["type"][] = [];
        const infractions: Infraction[] = [];
        const user = target instanceof GuildMember ? target.user : target;

        for (const action of actions) {
            const isMemberOnlyAction = ["kick", "mute", "role", "warn"].includes(action.type);

            if (isMemberOnlyAction && target instanceof User) {
                this.application.logger.warn(
                    `Skipping member-only action on user: ${target.id}, action: ${action.type}`
                );
                continue;
            }

            const result =
                isMemberOnlyAction && target instanceof GuildMember
                    ? await this.takeActionOnMember(guild, target, action as MemberOnlyAction)
                    : await this.takeActionOnUser(guild, user, action, payload);

            if (result instanceof Message) {
                continue;
            }

            if (result?.status !== "success") {
                failedActions.push(action.type);
            } else if (result && "infraction" in result) {
                infractions.push(result.infraction);
            }
        }

        return {
            failedActions,
            infractions
        };
    }

    private async takeActionOnMember(guild: Guild, target: GuildMember, action: MemberOnlyAction) {
        switch (action.type) {
            case "kick":
                return await this.infractionManager.createKick({
                    moderator: this.application.client.user!,
                    member: target,
                    reason: action.reason,
                    guildId: guild.id,
                    notify: action.notify
                });

            case "mute":
                return await this.infractionManager.createMute({
                    moderator: this.application.client.user!,
                    member: target,
                    reason: action.reason,
                    duration: action.duration,
                    guildId: guild.id,
                    notify: action.notify
                });

            case "role":
                try {
                    if (action.mode === "give") {
                        await target.roles.add(action.roles, `Automated action: ${action.reason}`);
                    } else {
                        await target.roles.remove(
                            action.roles,
                            `Automated action: ${action.reason}`
                        );
                    }
                } catch (error) {
                    this.application.logger.error(error);
                }

                // TODO: Duration

                return null;

            case "warn":
                return await this.infractionManager.createWarning({
                    moderator: this.application.client.user!,
                    member: target,
                    reason: action.reason,
                    guildId: guild.id,
                    notify: action.notify
                });

            default:
                throw new Error(`Invalid action type: ${action}`);
        }
    }

    private async takeActionOnUser(
        guild: Guild,
        target: User,
        action: ModerationAction,
        { channel, message }: TakeActionPayload
    ) {
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

            case "verbal_warn":
                return await channel
                    ?.send({
                        content: `${target}, you have received a verbal warning for: ${action.reason}`
                    })
                    .catch(this.application.logger.error);

            case "none":
                break;

            case "clear":
                if (!channel) {
                    throw new Error("Channel is required for clear action");
                }

                return await this.infractionManager.createClearMessages({
                    moderator: this.application.client.user!,
                    user: target,
                    reason: action.reason,
                    guildId: guild.id,
                    count: action.count,
                    channel,
                    respond: true
                });

            case "delete_message":
                if (!message) {
                    throw new Error("Message is required for delete_message action");
                }

                if (message.deletable) {
                    return await message.delete().catch(this.application.logger.error);
                }

                break;

            default:
                throw new Error(`Invalid action type: ${action.type}`);
        }
    }
}

export default ModerationActionService;
