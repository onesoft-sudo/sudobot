import BlazeBuild from "../core/BlazeBuild";
import { BufferedProgress } from "./BufferedProgress";

export default class IO {
    private static progressBar: BufferedProgress | null = null;

    public static fail(message: string): never {
        this.progressBar?.end();
        BlazeBuild.getInstance().logger.error(message);
        BlazeBuild.getInstance().logger.buildFailed();
        process.exit(-1);
    }

    public static shouldUseProgress(): boolean {
        return process.stdout.isTTY;
    }

    public static println(message: string | Error) {
        if (this.progressBar) {
            this.progressBar.println(message.toString());
            return;
        }

        console.info(message);
    }

    public static setProgressBuffer(progressBar: BufferedProgress) {
        IO.progressBar = progressBar;

        progressBar.on("end", () => {
            IO.progressBar = null;
        });
    }

    public static getProgressBuffer(): BufferedProgress | null {
        return IO.progressBar;
    }
}
