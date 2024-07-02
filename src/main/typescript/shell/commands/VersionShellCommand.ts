import ShellCommand from "@main/shell/core/ShellCommand";
import type { ShellCommandContext } from "@main/shell/core/ShellCommandContext";
import { _meta as meta } from "@root/package.json";
import chalk from "chalk";

class VersionShellCommand extends ShellCommand {
    public override readonly name: string = "version";
    public override readonly aliases = ["v"];

    public override async execute(context: ShellCommandContext): Promise<void> {
        context.println(
            `${chalk.white.bold("SudoBot")} ${chalk.green(`Version ${this.application.version}`)} (${chalk.blue(meta.release_codename)})`
        );
    }
}

export default VersionShellCommand;
