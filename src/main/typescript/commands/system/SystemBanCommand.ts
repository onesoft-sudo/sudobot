import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import UserArgument from "@framework/arguments/UserArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import ConfigurationManager from "@main/services/ConfigurationManager";
import { User } from "discord.js";

type SystemBanCommandArgs = {
    user: User;
};

@TakesArgument<SystemBanCommandArgs>({
    names: ["user"],
    types: [UserArgument<true>],
    optional: false,
    errorMessages: [UserArgument.defaultErrors]
})
class SystemBanCommand extends Command {
    public override readonly name = "sysban";
    public override readonly description: string = "Ban a user from the system.";
    public override readonly defer = true;
    public override readonly aliases = ["systemban"];
    public override readonly usage = ["<user: User>"];
    public override readonly systemAdminOnly = true;

    @Inject()
    private readonly configManager!: ConfigurationManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addUserOption(option =>
                option.setName("user").setDescription("The user to ban").setRequired(true)
            )
        ];
    }

    public override async execute(context: Context, { user }: SystemBanCommandArgs): Promise<void> {
        if (this.configManager.systemConfig.commands.system_banned_users.includes(user.id)) {
            await context.error(`User **${user.username}** is already banned from the system.`);
            return;
        }

        this.configManager.systemConfig.commands.system_banned_users.push(user.id);
        await this.configManager.write({ guild: false, system: true });
        await context.success(`User **${user.username}** has been banned from the system.`);
    }
}

export default SystemBanCommand;
