import { existsSync } from "fs";
import { rm } from "fs/promises";
import BlazeBuild from "../core/BlazeBuild";
import { BuiltInTask } from "../types/BuiltInTask";

export const cleanTask: BuiltInTask = {
    name: "clean",
    handler: async cli => {
        if (existsSync(cli.projectManager.buildDir)) {
            await rm(cli.projectManager.buildDir, { recursive: true, force: true });
        }

        const cacheFile = BlazeBuild.buildInfoDir("cache.json");

        if (existsSync(cacheFile)) {
            await cli.cacheManager.rmFile();
            cli.cacheManager.clear();
        }
    }
};
