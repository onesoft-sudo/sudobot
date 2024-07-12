import chalk from "chalk";

class IO {
    private static noOutput = false;

    public static setNoOutput(value: boolean) {
        this.noOutput = value;
    }

    public static warn(...args: unknown[]) {
        if (this.noOutput) {
            return;
        }

        console.warn(chalk.bold.yellow("warn  ") + chalk.reset(""), ...args);
    }

    public static error(...args: unknown[]) {
        if (this.noOutput) {
            return;
        }

        console.error(chalk.bold.red("error ") + chalk.reset(""), ...args);
    }

    public static fatal(...args: unknown[]): never {
        this.error(...args);
        process.exit(1);
    }

    public static debug(...args: unknown[]) {
        if (this.noOutput) {
            return;
        }

        if (process.env.BLAZEW_DEBUG !== "1") {
            return;
        }

        console.debug(chalk.bold.blue("debug ") + chalk.reset(""), ...args);
    }

    public static info(...args: unknown[]) {
        if (this.noOutput) {
            return;
        }

        console.info(chalk.green("info  ") + chalk.reset(""), ...args);
    }
}

export default IO;
