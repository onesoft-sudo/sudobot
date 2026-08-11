import dotenv from "dotenv";
import path from "node:path";

if (!("envLoaded" in global)) {
    Object.defineProperty(global, "envLoaded", { value: true });

    dotenv.config({
        path: global.isBundle
            ? (process.env.SUDOBOT_ENV_FILE ?? path.join(process.cwd(), ".env"))
            : undefined,
        quiet: true,
        processEnv: process.env
    });
}
