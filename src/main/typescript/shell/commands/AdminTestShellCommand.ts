import ShellCommand from "@main/shell/core/ShellCommand";
import type { ShellCommandContext } from "@main/shell/core/ShellCommandContext";

class AdminTestShellCommand extends ShellCommand {
    public override readonly name: string = "admintest";

    public override async execute(context: ShellCommandContext): Promise<void> {
        if (context.elevatedPrivileges) {
            context.println("Looks good! You have elevated privileges.");
        } else {
            context.println("You do not have elevated privileges.");
        }
    }
}

export default AdminTestShellCommand;
