import { env } from "@main/env/env";
import chalk from "chalk";
import readline from "readline/promises";

type ShellState = {
    lastExitCode: number;
    promptOverride?: string;
};

class Shell implements AsyncIterable<string> {
    public readonly rl = readline.createInterface({
        input: process.stdin as unknown as NodeJS.ReadableStream,
        output: process.stdout as unknown as NodeJS.WritableStream,
        history: [],
        historySize: 100,
        terminal: process.stdin.isTTY
    });

    private state: ShellState = {
        lastExitCode: 0
    };

    public readonly ws: WebSocket;
    private _wsConnected = false;

    public constructor() {
        this.setPrompt(this.getPrompt());

        this.rl.on("SIGINT", () => {
            console.log("^C");
            this.prompt();
            this.ws.send(
                JSON.stringify({
                    type: "terminate",
                    key: env.SYSTEM_SHELL_KEY
                })
            );
        });

        this.ws = new WebSocket(
            `ws://${process.env.SYSTEM_SHELL_EXEC_STREAM_HOST ?? "localhost"}:${process.env.SYSTEM_SHELL_EXEC_STREAM_PORT ?? "4001"}?key=${env.SYSTEM_SHELL_KEY}`
        );

        this.ws.addEventListener("open", () => {
            this._wsConnected = true;
        });

        this.ws.addEventListener("message", message => {
            const { type, payload } = JSON.parse(message.data.toString("utf-8"));

            switch (type) {
                case "stdout":
                    process.stdout.write(payload);
                    break;

                case "stderr":
                    process.stderr.write(payload);
                    break;

                default:
                    return;
            }
        });

        this.ws.addEventListener("close", () => {
            this.rl.close();

            console.error(
                `\n${chalk.red.bold("sbsh:")} ${chalk.white.bold("error:")} connection to shell service closed`
            );

            process.exit(1);
        });

        process.on("beforeExit", () => {
            this.ws.close();
        });
    }

    public awaitReady() {
        return new Promise<void>((resolve, reject) => {
            if (this._wsConnected) {
                resolve();
                return;
            }

            this.ws.addEventListener("open", () => resolve());
            this.ws.addEventListener("error", () => reject());
        });
    }

    public async *[Symbol.asyncIterator](): AsyncIterator<string> {
        this.prompt();

        for await (const line of this.rl) {
            yield line;
            this.prompt();
        }
    }

    public prompt() {
        this.rl.prompt(false);
    }

    private setPrompt(prompt: string = this.getPrompt()) {
        this.rl.setPrompt(prompt);
    }

    private getPrompt() {
        if (this.state.promptOverride) {
            return this.state.promptOverride;
        }

        let prompt = `${chalk.blueBright.bold(process.env.USER ? `${process.env.USER}@sbsh` : "sbsh")}`;

        if (this.state.lastExitCode !== 0) {
            prompt += ` ${chalk.red.bold("[" + this.state.lastExitCode + "]")}`;
        }

        prompt += " $ ";
        return prompt;
    }

    public setExitCode(code: number) {
        this.state.lastExitCode = code;
        this.setPrompt();
    }

    public handleBuiltInCommands(command: string, args: string[]) {
        switch (command) {
            case "exit":
                {
                    const code = args.length > 0 ? +args[0] : this.state.lastExitCode;

                    if (isNaN(code)) {
                        console.error(
                            `${chalk.red.bold("sbsh:")} ${chalk.white.bold("exit:")} expected exit code to be a number`
                        );

                        this.setExitCode(128);
                        return true;
                    }

                    this.ws.send(
                        JSON.stringify({
                            type: "terminate",
                            key: env.SYSTEM_SHELL_KEY
                        })
                    );

                    this.rl.close();
                    console.log("Logging out, goodbye.");
                    process.exit(code) as void;
                }
                break;

            case "clear":
                console.clear();
                break;

            default:
                return false;
        }

        this.setExitCode(0);
        return true;
    }

    public executeCommand(command: string) {
        this.ws.send(
            JSON.stringify({
                type: "cmd",
                key: env.SYSTEM_SHELL_KEY,
                payload: command
            })
        );
    }
}

export default Shell;
