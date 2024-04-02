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
}
