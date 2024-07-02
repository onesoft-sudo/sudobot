import ShellCommand from "@main/shell/core/ShellCommand";
import { ShellCommandContext } from "@main/shell/core/ShellCommandContext";

class SudoShellCommand extends ShellCommand {
    public override readonly name: string = "sudo";

    public override usage(context: ShellCommandContext) {
        context.println("Usage: sudo <command>");
    }

    public override async execute(context: ShellCommandContext): Promise<void> {
        if (!context.args[0]) {
            context.exit(1);
        }

        const service = this.application.service("shellService");
        await service.executeCommand(
            context.args.join(" "),
            context.ws,
            new ShellCommandContext(context.ws, context.args, true)
        );
    }
}

export default SudoShellCommand;
