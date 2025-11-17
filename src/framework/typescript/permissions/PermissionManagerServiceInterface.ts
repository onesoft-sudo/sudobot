import type { Awaitable, Snowflake } from "discord.js";
import type AbstractPermissionManager from "./AbstractPermissionManager";

interface PermissionManagerServiceInterface {
    getPermissionManager(guildId?: Snowflake): Awaitable<AbstractPermissionManager>;
}

export default PermissionManagerServiceInterface;
