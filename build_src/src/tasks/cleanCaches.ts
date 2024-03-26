import { existsSync } from "fs";
import BlazeBuild from "../core/BlazeBuild";
import { BuiltInTask } from "../types/BuiltInTask";

export const cleanCachesTask: BuiltInTask = {
    name: "cleanCaches",
    handler: async cli => {
        const cacheFile = BlazeBuild.buildInfoDir("cache.json");

        if (existsSync(cacheFile)) {
            await cli.cacheManager.rmFile();
            cli.cacheManager.clear();
        }
    }
};
