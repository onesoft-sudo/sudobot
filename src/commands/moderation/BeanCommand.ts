import { User } from "discord.js";
import { TakesArgument } from "../../framework/arguments/ArgumentTypes";
import RestStringArgument from "../../framework/arguments/RestStringArgument";
import UserArgument from "../../framework/arguments/UserArgument";
import { Command, CommandMessage } from "../../framework/commands/Command";
import Context from "../../framework/commands/Context";
import SystemAdminPermission from "../../permissions/SystemAdminPermission";
import { ErrorMessages } from "../../utils/ErrorMessages";

type BeanCommandArgs = {
    user: User;
    reason?: string;
};

@TakesArgument<BeanCommandArgs>("user", UserArgument<true>, false, UserArgument.defaultErrors)
@TakesArgument<BeanCommandArgs>("reason", RestStringArgument, true, ErrorMessages.reason)
class BeanCommand extends Command {
    public override readonly name = "bean";
    public override readonly description = "Beans a user.";
    public override readonly detailedDescription =
        "Sends a DM to the user telling them they've been beaned. It doesn't actually do anything.";
    public override readonly permissions = [SystemAdminPermission];

    public override async execute(
        context: Context<CommandMessage>,
        args: BeanCommandArgs
    ): Promise<void> {
        console.log(args);
        const { user, reason } = args;
        await user.send(`You've been beaned!${reason ? ` Reason: ${reason}` : ""}`);
        await context.reply("Beaned!");
    }
}

export default BeanCommand;
