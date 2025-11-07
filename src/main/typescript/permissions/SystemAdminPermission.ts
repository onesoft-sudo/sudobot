import { Inject } from "@framework/container/Inject";
import Permission from "@framework/permissions/Permission";
import ConfigurationManagerService from "@main/services/ConfigurationManagerService";
import type { User } from "discord.js";

class SystemAdminPermission extends Permission {
    public override readonly name: string = "system.admin";

    @Inject()
    private readonly configurationManagerService!: ConfigurationManagerService;

    public override hasUser(user: User) {
        return this.configurationManagerService.systemConfig.system_admins.includes(user.id);
    }
}

export default SystemAdminPermission;
