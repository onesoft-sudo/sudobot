import chalk from "chalk";
import Blaze from "../core/Blaze";

const now = process.hrtime.bigint();

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

    public static error(error: Error | string): void {
        if (error instanceof Error) {
            console.error(error.message);
            console.error(error.stack);
        } else {
            console.error(error);
        }
    }

    private static timeDiffFromStartup(): string {
        const diff = process.hrtime.bigint() - now;
        const ns = diff % 1000n;
        let time = Math.floor(Number(diff - ns) / 1000);
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
            str += `${Math.floor(time / 1000)}s `;
            time %= 1000;
        }

        if (str === "") {
            str += `${Math.floor(time)}ms`;
        }

        return str;
    }

    public static buildSuccessful(): void {
        console.log(`${chalk.green.bold("BUILD SUCCESSFUL")} in ${this.timeDiffFromStartup()}`);
        console.log(
            `${Blaze.getInstance().taskManager.getExecutedTaskCount()} actionable tasks: ${Blaze.getInstance().taskManager.getExecutedTaskCount()} executed`
        );
    }

    public static buildFailed(): void {
        console.log(`${chalk.red.bold("BUILD FAILED")} in ${this.timeDiffFromStartup()}`);
    }
}

export default IO;
