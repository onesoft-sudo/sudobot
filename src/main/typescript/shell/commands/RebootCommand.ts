import ShellCommand from "@main/shell/core/ShellCommand";
import type { ShellCommandContext } from "@main/shell/core/ShellCommandContext";

class RebootCommand extends ShellCommand {
    public override readonly name: string = "reboot";
    public override readonly aliases: string[] = ["restart"];

    public override async execute(context: ShellCommandContext): Promise<unknown> {
        if (!context.elevatedPrivileges) {
            return {
                code: 1,
                error: "reboot: Operation not permitted\nreboot: You may need elevated privileges to perform this action."
            };
        }

        context.println("Rebooting in 5 seconds. You will lose connection to the shell.");
        setTimeout(() => this.application.service("startupManager").requestRestart(), 5000);
    }
}

export default RebootCommand;
