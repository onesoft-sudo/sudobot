import ShellCommand from "@main/shell/core/ShellCommand";
import type { ShellCommandContext } from "@main/shell/core/ShellCommandContext";

class SudoShellCommand extends ShellCommand {
    public override readonly name: string = "sudo";

    public override async execute(context: ShellCommandContext): Promise<unknown> {
        if (!context.args[0]) {
            return { code: 1, error: "Usage: sudo <command>" };
        }

        const service = this.application.service("shellService");

        return await service.simpleExecute(context.args[0], {
            elevatedPrivileges: true,
            args: context.args.slice(1)
        });
    }
}

export default SudoShellCommand;
