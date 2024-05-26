import chalk from "chalk";
import { performance } from "perf_hooks";
import Blaze from "../core/Blaze";

const now = performance.now();

class IO {
    public static println(message: string): void {
        console.log(message);
    }

    public static debug(message: string): void {
        if (process.env.BLAZE_DEBUG !== "1") {
            return;
        }

        console.debug(chalk.white.dim(message));
    }

    public static error(error: unknown): void {
        if (error instanceof Error) {
            console.error(error.message);
            console.error(error.stack);
        } else {
            console.error(error);
        }
    }

    private static timeDiffFromStartup(): string {
        let time = performance.now() - now;
        let str = "";

        if (time > 86400000) {
            str += `${Math.floor(time / 86400000)}d `;
            time %= 86400000;
        }

        if (time > 3600000) {
            str += `${Math.floor(time / 3600000)}h `;
            time %= 3600000;
        }

        if (time > 60000) {
            str += `${Math.floor(time / 60000)}m `;
            time %= 60000;
        }

        if (time > 1000) {
            str += `${(time / 1000).toFixed(2).replace(/\.00$/, "")}s `;
            time %= 1000;
        }

        if (str === "") {
            str += `${Math.floor(time)}ms`;
        }

        return str;
    }

    public static buildSuccessful(): void {
        console.log(`\n${chalk.green.bold("BUILD SUCCESSFUL")} in ${this.timeDiffFromStartup()}`);
        console.log(
            `${Blaze.getInstance().taskManager.getExecutedTaskCount()} actionable tasks: ${Blaze.getInstance().taskManager.getExecutedTaskCount()} executed`
        );
    }

    public static buildFailed(): void {
        console.log(`\n${chalk.red.bold("BUILD FAILED")} in ${this.timeDiffFromStartup()}`);
    }

    public static exit(code: number = 0): void {
        process.exit(code);
    }
}

export default IO;
