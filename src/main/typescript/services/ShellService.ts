import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { f } from "@framework/utils/string";
import { _meta as meta, version } from "@root/package.json";
import chalk from "chalk";
import { lstat, readdir } from "fs/promises";
import path from "path";

@Name("shellService")
class ShellService extends Service {
    public async simpleExecute(command: string, args: string[]) {
        this.application.logger.event("Executing shell command: ", command, args);

        switch (command) {
            case "version":
            case "v":
                return {
                    output: f`
                    ${chalk.white.bold("SudoBot")} ${chalk.green(`Version ${version}`)} (${chalk.blue(meta.release_codename)})`,
                    error: null
                };

            case "cd":
                if (args.length === 0) {
                    return { output: null, error: "cd: missing operand" };
                }

                try {
                    process.chdir(args[0]);
                    return { output: null, error: null };
                } catch (error) {
                    return { output: null, error: (error as Error).message ?? `${error}` };
                }

            case "ls": {
                // with colors
                try {
                    const cwd = process.cwd();
                    const files = await readdir(cwd);
                    let output = "";

                    for (const file of files) {
                        const stat = await lstat(path.join(cwd, file));

                        if (stat.isDirectory()) {
                            output += chalk.blue.bold(file) + "/\n";
                        } else if (stat.isSymbolicLink()) {
                            output += chalk.cyan(file) + "@\n";
                        } else if (stat.isBlockDevice()) {
                            output += chalk.yellow(file) + "\n";
                        } else if (stat.isCharacterDevice()) {
                            output += chalk.magenta(file) + "\n";
                        } else if (stat.isFIFO()) {
                            output += chalk.yellow.bold(file) + "\n";
                        } else if (stat.isSocket()) {
                            output += chalk.red(file) + "\n";
                        } else if (stat.mode & 0o111) {
                            output += chalk.green.bold(file) + "*\n";
                        } else {
                            output += file + "\n";
                        }
                    }

                    return {
                        output: output.trimEnd(),
                        error: null
                    };
                } catch (error) {
                    return { output: null, error: (error as Error).message ?? `${error}` };
                }
            }
        }

        return { output: null, error: `${command}: command not found` };
    }
}

export default ShellService;
