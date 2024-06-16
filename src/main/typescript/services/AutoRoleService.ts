import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { GuildMember } from "discord.js";

@Name("autoRoleService")
class AutoRoleService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @GatewayEventListener("guildMemberAdd")
    public async onGuildMemberAdd(member: GuildMember) {
        const config = this.configManager.config[member.guild.id]?.auto_role;

        if (!config?.enabled || (member.user.bot && config.ignore_bots) || !member.manageable) {
            return;
        }

        await member.roles
            .add(config.roles, "Automatic: Auto-Role Service")
            .catch(this.application.logger.error);
    }
}

export default AutoRoleService;
