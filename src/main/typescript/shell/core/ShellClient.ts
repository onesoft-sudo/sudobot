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

import { env } from "@main/env/env";
import { AxiosError } from "axios";
import chalk from "chalk";
import readline from "readline/promises";

type ShellState = {
    lastExitCode: number;
    promptOverride?: string;
};

class ShellClient {
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
        this.setReadlinePrompt(this.getPrompt());

        this.rl.on("SIGINT", () => {
            console.log("^C");
            this.printPrompt();
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
            this.clearReadline();
            console.error(`${chalk.red.bold("sbsh:")} connection to shell service closed`);
            process.exit(1);
        });

        process.on("beforeExit", () => {
            this.ws.close();
        });
    }

    public ready() {
        return new Promise<void>((resolve, reject) => {
            if (this._wsConnected) {
                resolve();
                return;
            }

            this.ws.addEventListener("open", () => resolve());
            this.ws.addEventListener("error", () => reject());
        });
    }

    public async start() {
        await this.ready();
        this.printPrompt();

        for await (const line of this.rl) {
            await this.processInput(line);
            this.printPrompt();
        }
    }

    public printPrompt() {
        this.rl.prompt(false);
    }

    private setReadlinePrompt(prompt: string = this.getPrompt()) {
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
        this.setReadlinePrompt();
    }

    private clearReadline() {
        this.rl.setPrompt("");
        this.rl.prompt();
        this.rl.close();
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

    public executeRawShellCommand(command: string) {
        this.ws.send(
            JSON.stringify({
                type: "raw_cmd",
                key: env.SYSTEM_SHELL_KEY,
                payload: command
            })
        );
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

    private async processInput(input: string) {
        await this.handleCommand(input);
    }

    private async handleCommand(input: string) {
        if (input[0] === "$" && input.slice(1).trim().length === 0) {
            console.error(`${chalk.red.bold("sbsh:")} expected raw shell command after "$"`);
            return;
        }

        const [command, ...args] = input.split(/\s+/);

        if (this.handleBuiltInCommands(command, args)) {
            return;
        }

        try {
            if (input[0] === "$") {
                this.executeRawShellCommand(input.slice(1));
            } else {
                this.executeCommand(input);
            }

            await new Promise<void>(resolve => {
                const handler = (message: MessageEvent) => {
                    const { type, payload } = JSON.parse(message.data.toString("utf-8"));

                    if (type === "exit" || type === "signal" || type === "sh_error") {
                        const code = +payload;
                        this.ws.removeEventListener("message", handler);
                        this.setExitCode(isNaN(code) ? 128 : code);

                        if (type === "sh_error") {
                            console.error(`${chalk.red.bold("sbsh:")} ${payload}`);
                        }

                        resolve();
                        return;
                    }
                };

                this.ws.addEventListener("message", handler);
            });
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                console.error(
                    `${chalk.red.bold("sbsh:")} ${chalk.white.bold("SIGINT")} received, aborting command execution`
                );

                return;
            }

            if (error instanceof AxiosError) {
                console.error(
                    `${error.response?.data.shortError ?? error.response?.data.error ?? error?.message}`
                );
                this.setExitCode(error.response?.data.code ?? 1);
                return;
            }

            console.error(error);
        }
    }
}

export default ShellClient;
