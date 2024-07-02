import ShellClient from "@main/shell/core/ShellClient";

async function main() {
    if (!process.env.SYSTEM_SHELL_KEY) {
        throw new Error("Environment variable SYSTEM_SHELL_KEY is not defined");
    }

    const shell = new ShellClient();
    await shell.start();
}

main().then();
