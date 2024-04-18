import { Command } from "@framework/commands/Command";
import CommandRateLimiterContract from "@framework/contracts/CommandRateLimiterContract";
import { Awaitable } from "discord.js";
import Context from "../commands/Context";
import { MemberPermissionData } from "./PermissionManagerInterface";

export type CommandPermissionCheckResult = {
    allow: boolean;
    overwrite: boolean;
};

export interface CommandManagerServiceInterface {
    checkCommandPermissionOverwrites(
        context: Context,
        name: string,
        alreadyComputedPermissions?: MemberPermissionData
    ): Awaitable<CommandPermissionCheckResult | null>;
    addCommand(
        command: Command,
        loadMetadata: boolean,
        groups: Record<string, string> | null,
        defaultGroup?: string
    ): Awaitable<void>;
    getCommand(name: string): Command | null;
    getRateLimiter(): CommandRateLimiterContract;
}
