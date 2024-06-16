import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import ConfigurationManager from "@main/services/ConfigurationManager";

class AntiMemberJoinCommand extends Command {
    public override readonly name = "antijoin";
    public override readonly description: string = "Enable or disable the anti-join system.";
    public override readonly defer = true;
    public override permissions = [PermissionFlags.ManageGuild];

    @Inject()
    private readonly configManager!: ConfigurationManager;

    public override async execute(context: Context): Promise<void> {
        if (!this.configManager.config[context.guild.id]) {
            return void context.error("This server does not have a configuration.");
        }

        this.configManager.config[context.guild.id]!.anti_member_join ??= {
            enabled: false,
            behavior: "kick",
            ignore_bots: true
        };

        this.configManager.config[context.guild.id]!.anti_member_join!.enabled =
            !this.configManager.config[context.guild.id]!.anti_member_join?.enabled;

        await this.configManager.write();

        return void context.success(
            `The anti-join system has been ${
                this.configManager.config[context.guild.id]!.anti_member_join?.enabled
                    ? "enabled"
                    : "disabled"
            }.`
        );
    }
}

export default AntiMemberJoinCommand;
