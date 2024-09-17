/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import type { Infraction } from "@main/models/Infraction";
import { ModerationActionType } from "@main/schemas/ModerationActionSchema";
import { formatDistanceToNowStrict } from "date-fns";
import {
    Guild,
    GuildMember,
    Message,
    TextChannel,
    User,
    bold,
    italic,
    roleMention
} from "discord.js";
import type InfractionManager from "./InfractionManager";

type MemberOnlyAction = Extract<ModerationActionType, { type: "kick" | "mute" | "role" | "warn" }>;

type TakeActionResult = {
    failedActions: ModerationActionType["type"][];
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
        actions: ModerationActionType[],
        payload: TakeActionPayload = {}
    ): Promise<TakeActionResult> {
        const failedActions: ModerationActionType["type"][] = [];
        const failedActionResults: unknown[] = [];
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
                failedActionResults.push(result);
            } else if (result && "infraction" in result && result.infraction) {
                infractions.push(result.infraction);
            }
        }

        if (failedActions.length) {
            this.application.logger.debug("Failed actions: ", failedActions);
            this.application.logger.debug("Failed action results: ", failedActionResults);
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
                    duration: action.duration
                        ? Duration.fromMilliseconds(action.duration)
                        : undefined,
                    guildId: guild.id,
                    notify: action.notify
                });

            case "role":
                return await this.infractionManager.createRoleModification({
                    moderator: this.application.client.user!,
                    member: target,
                    reason: action.reason,
                    guildId: guild.id,
                    roles: action.roles,
                    notify: action.notify,
                    mode: action.mode,
                    duration: action.duration
                        ? Duration.fromMilliseconds(action.duration)
                        : undefined
                });

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
        action: ModerationActionType,
        { channel, message }: TakeActionPayload
    ) {
        switch (action.type) {
            case "ban":
                return await this.infractionManager.createBan({
                    moderator: this.application.client.user!,
                    user: target,
                    reason: action.reason,
                    deletionTimeframe: action.delete_timeframe
                        ? Duration.fromMilliseconds(action.delete_timeframe)
                        : undefined,
                    guildId: guild.id,
                    duration: action.duration
                        ? Duration.fromMilliseconds(action.duration)
                        : undefined
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

    private commonSummary(action: ModerationActionType, name: string) {
        let summary = bold(name) + "\n";

        if ("duration" in action && action.duration) {
            summary += `Duration: ${formatDistanceToNowStrict(Date.now() - action.duration)}\n`;
        }

        if ("notify" in action) {
            summary += `Notification: ${action.notify ? "Delivered" : "Not delivered"}\n`;
        }

        return summary;
    }

    public summarizeActions(actions: ModerationActionType[]) {
        let summary = "";

        for (const action of actions) {
            switch (action.type) {
                case "ban":
                    summary += this.commonSummary(action, "Banned");
                    break;
                case "mute":
                    summary += this.commonSummary(action, "Muted");
                    break;
                case "kick":
                    summary += this.commonSummary(action, "Kicked");
                    break;
                case "warn":
                    summary += this.commonSummary(action, "Warned");
                    break;
                case "clear":
                    summary += this.commonSummary(action, "Cleared recent messages");
                    summary += `Count: ${action.count ?? italic("None")}\n`;
                    break;
                case "role":
                    summary += this.commonSummary(
                        action,
                        `Roles ${action.mode === "give" ? "Added" : "Removed"}`
                    );
                    summary += `Roles: ${action.roles.map(r => roleMention(r)).join(", ")}\n`;
                    break;
                case "verbal_warn":
                    summary += this.commonSummary(action, "Verbally Warned");
                    break;
                case "delete_message":
                    summary += bold("Deleted Message") + "\n";
                    break;
                default:
                    throw new Error(`Unknown action type: ${action.type}`);
            }
        }

        return summary === "" ? italic("No actions taken") : summary;
    }
}

export default ModerationActionService;
