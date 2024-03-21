import { GuildMember } from "discord.js";
import Application from "../framework/app/Application";
import FluentSet from "../framework/collections/FluentSet";
import AbstractPermissionManager from "../framework/permissions/AbstractPermissionManager";
import {
    AbstractPermissionManagerService,
    SystemPermissionResolvable
} from "../framework/permissions/AbstractPermissionManagerService";
import { Name } from "../framework/services/Name";
import { OptionalRecord } from "../framework/types/OptionalRecord";
import DiscordPermissionManager from "../security/DiscordPermissionManager";
import LayeredPermissionManager from "../security/LayeredPermissionManager";
import { PermissionMode } from "../types/GuildConfigSchema";

@Name("permissionManager")
class PermissionManagerService extends AbstractPermissionManagerService {
    public readonly managers: OptionalRecord<PermissionMode, AbstractPermissionManager> = {};

    public constructor(application: Application) {
        super(application);
        this.createManagers();
    }

    private createManagers() {
        const config = this.application.getServiceByName("configManager").config;
        const modes = new FluentSet<PermissionMode>();

        for (const guildId in config) {
            const mode = config[guildId]?.permissions.mode;

            if (mode) {
                modes.add(mode);
            }
        }

        for (const mode of modes) {
            const manager = this.createManager(mode);
            manager.boot?.();
            this.managers[mode] = manager;
        }
    }

    private createManager(mode: PermissionMode) {
        switch (mode) {
            case "layered":
                return new LayeredPermissionManager(this.application);

            case "discord":
                return new DiscordPermissionManager(this.application);

            default:
                throw new Error(`Unknown permission mode: ${mode}`);
        }
    }

    public async hasPermissions(member: GuildMember, permissions: SystemPermissionResolvable[]) {
        const mode =
            this.application.getServiceByName("configManager").config[member.guild.id]?.permissions
                .mode ?? "discord";

        if (!this.managers[mode]) {
            this.managers[mode] = this.createManager(mode);
            await this.managers[mode]!.boot?.();
        }

        return this.managers[mode]!.hasPermissions(member, permissions);
    }
}

export default PermissionManagerService;
