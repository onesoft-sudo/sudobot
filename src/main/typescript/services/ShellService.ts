import Application from "@framework/app/Application";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { f } from "@framework/utils/string";
import { env } from "@main/env/env";
import { _meta as meta, version } from "@root/package.json";
import chalk from "chalk";
import { spawn } from "child_process";
import { Awaitable } from "discord.js";
import { lstat, readdir } from "fs/promises";
import { createServer } from "http";
import path from "path";
import { URLSearchParams } from "url";
import { WebSocket } from "ws";

@Name("shellService")
class ShellService extends Service {
    public readonly wss: InstanceType<typeof WebSocket.Server>;
    public readonly server = createServer();

    public constructor(application: Application) {
        super(application);

        this.wss = new WebSocket.Server({
            server: this.server
        });
    }

    public override boot(): Awaitable<void> {
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
                    case "cmd":
                        this.executeShellCommand(payload, ws);
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

            console.log(type.toUpperCase(), payload);

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
                if (!args[0]) {
                    return { output: null, error: "cd: missing operand", code: 2 };
                }

                try {
                    process.chdir(args[0]);
                    return { output: null, error: null, code: 0 };
                } catch (error) {
                    return {
                        output: null,
                        error: "cd: " + ((error as Error).message ?? `${error}`),
                        code: 1
                    };
                }

            case "ls": {
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
                        error: null,
                        code: 0
                    };
                } catch (error) {
                    return { output: null, error: (error as Error).message ?? `${error}`, code: 1 };
                }
            }
        }

        return { output: null, error: `${command}: command not found`, code: 127 };
    }
}

export default ShellService;
