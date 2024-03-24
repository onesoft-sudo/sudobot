import BlazeBuild from "../core/BlazeBuild";

export default class IO {
    public static fail(message: string): never {
        BlazeBuild.getInstance().logger.error(message);
        BlazeBuild.getInstance().logger.buildFailed();
        process.exit(-1);
    }

    public static shouldUseProgress(): boolean {
        return process.stdout.isTTY;
    }

    public static println(message: string) {
        console.info(message);
    }
}
