import type ArgumentParser from "@framework/arguments/ArgumentParser";
import type { Command } from "@framework/commands/Command";
import type CommandRateLimiterContract from "@framework/contracts/CommandRateLimiterContract";
import type { Awaitable } from "discord.js";
import type Context from "../commands/Context";
import type { MemberPermissionData } from "./PermissionManagerInterface";

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
    getArgumentParser(): ArgumentParser;
}
