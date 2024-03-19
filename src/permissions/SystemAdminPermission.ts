import { GuildMember } from "discord.js";
import { Inject } from "../framework/container/Inject";
import { Permission } from "../framework/security/Permission";
import type ConfigurationManager from "../services/ConfigurationManager";

class SystemAdminPermission extends Permission {
    protected override readonly name = "SystemAdminPermission";

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    public override async validate(member: GuildMember): Promise<boolean> {
        return this.configManager.systemConfig.system_admins.includes(member.id);
    }
}

export default SystemAdminPermission;
