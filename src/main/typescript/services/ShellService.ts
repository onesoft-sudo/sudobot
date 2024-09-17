/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

import Application from "@framework/app/Application";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { env } from "@main/env/env";
import ExitError from "@main/shell/core/ExitError";
import ShellCommand from "@main/shell/core/ShellCommand";
import { ShellCommandContext } from "@main/shell/core/ShellCommandContext";
import { _meta as meta, version } from "@root/package.json";
import chalk from "chalk";
import { spawn } from "child_process";
import { Collection } from "discord.js";
import { lstat, readdir } from "fs/promises";
import { createServer, Server } from "http";
import path from "path";
import { URLSearchParams } from "url";
import { WebSocket } from "ws";

@Name("shellService")
class ShellService extends Service {
    public readonly wss: InstanceType<typeof WebSocket.Server>;
    public readonly server: Server = createServer();
    private readonly commands = new Collection<string, ShellCommand>();

    public constructor(application: Application) {
        super(application);

        this.wss = new WebSocket.Server({
            server: this.server
        });
    }

    public override async boot(): Promise<void> {
        const classes = await this.application.classLoader.loadClassesFromDirectory(
            path.resolve(__dirname, "../shell/commands")
        );

        for (const ShellCommandClass of classes) {
            const command = new ShellCommandClass(this.application) as ShellCommand;
            this.commands.set(command.name, command);

            for (const alias of command.aliases) {
                this.commands.set(alias, command);
            }
        }

        this.wss.on("connection", ws => {
            this.application.logger.debug("Connection established");

            if (!ws.url.startsWith("/?")) {
                ws.send(JSON.stringify({ type: "error", payload: "Invalid URL" }));
                ws.close();
                return;
            }

            const searchParams = new URLSearchParams(ws.url.slice(2));

            if (searchParams.get("key") !== env.SYSTEM_SHELL_KEY) {
                ws.send(JSON.stringify({ type: "error", payload: "Invalid key" }));
                ws.close();
                return;
            }

            ws.on("message", async message => {
                const { payload, type, key } = JSON.parse(message.toString());

                if (key !== env.SYSTEM_SHELL_KEY) {
                    ws.send(JSON.stringify({ type: "error", payload: "Invalid key" }));
                    return;
                }

                switch (type) {
                    case "raw_cmd":
                        this.executeShellCommand(payload, ws);
                        break;

                    case "cmd":
                        this.executeCommand(payload, ws);
                        break;

                    case "stdin":
                        break;

                    default:
                        ws.send(JSON.stringify({ type: "error", payload: "Invalid message type" }));
                        return;
                }
            });

            ws.on("close", () => {
                this.application.logger.debug("Connection closed");
            });
        });

        this.wss.on("close", () => {
            this.application.logger.debug("Server closed");
        });

        this.wss.on("error", error => {
            this.application.logger.debug("Server error", error);
        });

        this.server.listen(parseInt(env.SYSTEM_SHELL_EXEC_STREAM_PORT ?? "4001"), () => {
            this.application.logger.info(
                `Shell service listening on port ${env.SYSTEM_SHELL_EXEC_STREAM_PORT ?? "4001"}`
            );
        });
    }

    public executeShellCommand(command: string, ws: WebSocket) {
        const child = spawn(command, {
            shell: true,
            stdio: "pipe"
        });

        const onMessage = (message: Buffer) => {
            const { payload, type, key } = JSON.parse(message.toString());

            if (key !== env.SYSTEM_SHELL_KEY) {
                ws.send(JSON.stringify({ type: "error", payload: "Invalid key" }));
                return;
            }

            if (type === "stdin") {
                child.stdin.write(payload);
                return;
            }

            if (type === "terminate" && !child.killed) {
                child.kill();
                return;
            }
        };

        child.stdout.on("data", data => {
            ws.send(JSON.stringify({ type: "stdout", payload: data.toString() }));
        });

        child.stderr.on("data", data => {
            ws.send(JSON.stringify({ type: "stderr", payload: data.toString() }));
        });

        child.on("error", error => {
            ws.off("message", onMessage);
            ws.send(JSON.stringify({ type: "error", payload: error }));
        });

        child.on("exit", (code, signal) => {
            ws.off("message", onMessage);

            if (code !== null) {
                ws.send(JSON.stringify({ type: "exit", payload: code }));
            } else {
                ws.send(JSON.stringify({ type: "signal", payload: signal }));
            }
        });

        ws.on("close", () => {
            ws.off("message", onMessage);

            if (!child.killed) {
                child.kill();
            }
        });

        ws.on("message", onMessage);
    }

    private async simpleExecute(
        command: string,
        context: ShellCommandContext,
        options?: ShellExecuteOptions
    ) {
        this.application.logger.event("Executing shell command: ", command, options);

        switch (command) {
            case "version":
            case "v":
                context.println(
                    `${chalk.white.bold("SudoBot")} ${chalk.green(`Version ${version}`)} (${chalk.blue(meta.release_codename)})`
                );
                break;

            case "cd":
                if (!options?.args?.[0]) {
                    context.println("cd: missing operand", "stderr");
                    context.exit(2);
                }

                try {
                    process.chdir(options.args[0]);
                    break;
                } catch (error) {
                    context.println("cd: " + ((error as Error).message ?? `${error}`), "stderr");
                    context.exit(1) as void;
                }

                break;

            case "ls":
                {
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

                        context.println(output.trimEnd());
                    } catch (error) {
                        context.println(
                            "ls: " + ((error as Error).message ?? `${error}`),
                            "stderr"
                        );
                        context.exit(1);
                    }
                }

                break;

            default:
                return false;
        }

        return true;
    }

    public async executeCommand(
        commandString: string,
        ws: WebSocket,
        defaultContext?: ShellCommandContext
    ) {
        const [command, ...args] = commandString.split(/\s+/);

        if (!command) {
            ws.send(JSON.stringify({ type: "sh_error", payload: "No command provided" }));
            return;
        }

        const shellCommand = this.commands.get(command);

        if (!shellCommand) {
            ws.send(
                JSON.stringify({
                    type: "sh_error",
                    payload: `${command}: command not found`,
                    code: 127
                })
            );
            return;
        }

        const context = defaultContext ?? new ShellCommandContext(ws, args, false);

        context.on("stdout", (data: string) => {
            ws.send(JSON.stringify({ type: "stdout", payload: data }));
        });

        context.on("stderr", (data: string) => {
            ws.send(JSON.stringify({ type: "stderr", payload: data }));
        });

        context.on("exit", (code: number) => {
            ws.send(JSON.stringify({ type: "exit", payload: code }));
        });

        try {
            await shellCommand.execute(context);
            ws.send(JSON.stringify({ type: "exit", payload: 0 }));
        } catch (error) {
            if (error instanceof ExitError) {
                ws.send(JSON.stringify({ type: "exit", payload: error.getCode() }));
                return;
            }

            ws.send(
                JSON.stringify({ type: "error", payload: (error as Error).message ?? `${error}` })
            );
        }
    }
}

type ShellExecuteOptions = {
    args?: string[];
    elevatedPrivileges?: boolean;
};

export default ShellService;
