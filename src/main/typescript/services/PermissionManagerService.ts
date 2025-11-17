import { Inject } from "@framework/container/Inject";
import type AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager";
import type PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface";
import Service from "@framework/services/Service";
import type { Snowflake } from "discord.js";
import ConfigurationManagerService, { ConfigurationType } from "./ConfigurationManagerService";
import { GuildConfigurationType } from "@schemas/GuildConfigurationSchema";
import SELinuxPermissionManager from "@framework/selinux/SELinuxPermissionManager";
import Application from "@framework/app/Application";

export const SERVICE_PERMISSION_MANAGER = "permissionManagerService" as const;

type PermissionModeString = NonNullable<GuildConfigurationType["permissions"]>["mode"];

class PermissionManagerService extends Service implements PermissionManagerServiceInterface {
    public override readonly name = SERVICE_PERMISSION_MANAGER;

    private readonly permissionManagerRecord: Record<PermissionModeString, AbstractPermissionManager>;

    public constructor(application: Application) {
        super(application);

        this.permissionManagerRecord = {
            /* FIXME: Make an actual DiscordPermissionManager class */
            discord: new SELinuxPermissionManager(application),
            selinux: new SELinuxPermissionManager(application),
        };
    }

    @Inject()
    private readonly configurationManagerService!: ConfigurationManagerService;

    public async getPermissionManager(guildId?: Snowflake): Promise<AbstractPermissionManager> {
        const { permissions } = await this.configurationManagerService.get(
            guildId ? ConfigurationType.Guild : ConfigurationType.DirectMessage,
            guildId ?? "0"
        );

        const mode = permissions?.mode ?? "discord";
        return this.permissionManagerRecord[mode] || this.permissionManagerRecord.discord;
    }
}

export default PermissionManagerService;
