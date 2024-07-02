import ShellCommand from "@main/shell/core/ShellCommand";
import type { ShellCommandContext } from "@main/shell/core/ShellCommandContext";

class RebootShellCommand extends ShellCommand {
    public override readonly name: string = "reboot";
    public override readonly aliases: string[] = ["restart"];

    public override async execute(context: ShellCommandContext): Promise<void> {
        if (!context.elevatedPrivileges) {
            context.println("reboot: Operation not permitted", "stderr");
            context.println(
                "reboot: You may need elevated privileges to perform this action.",
                "stderr"
            );
            context.exit(1);
        }

        context.println("Rebooting in 5 seconds. You will lose connection to the shell.");
        setTimeout(() => this.application.service("startupManager").requestRestart(), 5000);
    }
}

export default RebootShellCommand;
