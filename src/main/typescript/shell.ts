import Shell from "@main/shell/core/Shell";
import axios, { AxiosError } from "axios";
import chalk from "chalk";

async function main() {
    if (!process.env.SYSTEM_SHELL_KEY) {
        throw new Error("Environment variable SYSTEM_SHELL_KEY is not defined");
    }

    const shell = new Shell();

    await shell.awaitReady();

    for await (const input of shell) {
        if (input.startsWith("$")) {
            if (input.slice(1).trim().length === 0) {
                console.error(`${chalk.red.bold("sbsh:")} expected raw shell command after "$"`);
                continue;
            }

            try {
                shell.executeCommand(input.slice(1));

                await new Promise<void>(resolve => {
                    const handler = (message: MessageEvent) => {
                        const { type, payload } = JSON.parse(message.data.toString("utf-8"));

                        if (type === "exit" || type === "signal") {
                            const code = +payload;
                            shell.ws.removeEventListener("message", handler);
                            shell.setExitCode(isNaN(code) ? 128 : code);
                            resolve();
                        }
                    };

                    shell.ws.addEventListener("message", handler);
                });
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    console.error(
                        `${chalk.red.bold("sbsh:")} ${chalk.white.bold("SIGINT")} received, aborting command execution`
                    );
                    continue;
                }

                if (error instanceof AxiosError) {
                    console.error(
                        `${chalk.red.bold("sbsh:")} ${error.response?.data.shortError ?? error.response?.data.error ?? error?.message}`
                    );

                    shell.setExitCode(error.response?.data.code ?? 1);
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
                `${process.env.SYSTEM_API_URL}/shell/command`,
                {
                    command,
                    args
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.SYSTEM_SHELL_KEY}`
                    }
                }
            );

            if (data.output !== null) {
                console.log(data.output);
            }

            shell.setExitCode(0);
        } catch (error) {
            if (error instanceof AxiosError) {
                console.error(
                    `${chalk.red.bold("sbsh:")} ${error.response?.data.error ?? error?.message}`
                );

                shell.setExitCode(error.response?.data.code ?? 1);
                continue;
            }

            console.error(error);
        }
    }
}

main().then();
