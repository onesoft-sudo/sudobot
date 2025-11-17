import type AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager";
import type PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface";
import Service from "@framework/services/Service";
import type { Snowflake, Awaitable } from "discord.js";
import PermissionManager from "./PermissionManager";

class PermissionManagerService extends Service implements PermissionManagerServiceInterface {
    public override name = "permissionManagerService";
    private readonly permissionManager = new PermissionManager(this.application);

    public getPermissionManager(_guildId?: Snowflake): Awaitable<AbstractPermissionManager> {
        return this.permissionManager;
    }
}

export default PermissionManagerService;
