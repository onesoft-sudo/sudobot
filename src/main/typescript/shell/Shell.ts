import { env } from "@main/env/env";
import axios, { AxiosError } from "axios";
import chalk from "chalk";
import readline from "readline/promises";

class Shell implements AsyncIterable<string> {
    private readonly rl = readline.createInterface({
        input: process.stdin as unknown as NodeJS.ReadableStream,
        output: process.stdout as unknown as NodeJS.WritableStream,
        history: [],
        historySize: 100,
        terminal: process.stdin.isTTY
    });

    private readonly prompt = `${chalk.blueBright.bold(process.env.USER ? `${process.env.USER}@sbsh$` : "sbsh$")} `;

    public constructor() {
        this.rl.on("SIGINT", () => {
            console.log("^C");
            this.rl.prompt();
        });
    }

    public async *[Symbol.asyncIterator](): AsyncIterator<string> {
        while (true) {
            const command = await this.rl.question(this.prompt);

            if (!command) {
                continue;
            }

            yield command;
        }
    }

    public handleBuiltInCommands(command: string, _args: string[]) {
        switch (command) {
            case "exit":
                process.exit(0) as void;
                break;

            case "clear":
                console.clear();
                break;

            default:
                return false;
        }

        return true;
    }
}

async function main() {
    if (!env.SYSTEM_SHELL_KEY) {
        throw new Error("Environment variable SYSTEM_SHELL_KEY is not defined");
    }

    const shell = new Shell();

    for await (const input of shell) {
        if (input.startsWith("$")) {
            if (input.slice(1).trim().length === 0) {
                console.error(`${chalk.red.bold("sbsh:")} expected raw shell command after "$"`);
                continue;
            }

            try {
                const { data } = await axios.post(
                    `${env.SYSTEM_API_URL}/shell/exec`,
                    {
                        command: input.slice(1)
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${env.SYSTEM_SHELL_KEY}`
                        }
                    }
                );

                console.log(data.output);
            } catch (error) {
                if (error instanceof AxiosError) {
                    console.error(
                        `${chalk.red.bold("sbsh:")} ${error.response?.data.error ?? error?.message}`
                    );
                    continue;
                }

                console.error(error);
            }

            continue;
        }

        const [command, ...args] = input.split(/\s+/);

        if (shell.handleBuiltInCommands(command, args)) {
            continue;
        }

        try {
            const { data } = await axios.post(
                `${env.SYSTEM_API_URL}/shell/command`,
                {
                    command,
                    args
                },
                {
                    headers: {
                        Authorization: `Bearer ${env.SYSTEM_SHELL_KEY}`
                    }
                }
            );

            console.log(data.output);
        } catch (error) {
            if (error instanceof AxiosError) {
                console.error(
                    `${chalk.red.bold("sbsh:")} ${error.response?.data.error ?? error?.message}`
                );
                continue;
            }

            console.error(error);
        }
    }
}

main().then();
