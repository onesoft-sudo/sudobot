import { existsSync } from "fs";
import { readdir, rm } from "fs/promises";
import BlazeBuild from "../core/BlazeBuild";
import { BuiltInTask } from "../types/BuiltInTask";

export const cleanTask: BuiltInTask = {
    name: "clean",
    handler: async cli => {
        if (existsSync(cli.projectManager.buildDir)) {
            await rm(cli.projectManager.buildDir, { recursive: true, force: true });
        }

        const buildInfoDir = BlazeBuild.buildInfoDir("");

        if (existsSync(buildInfoDir)) {
            const files = await readdir(buildInfoDir);

            for (const file of files) {
                if (file.endsWith(".d.ts")) {
                    continue;
                }

                await rm(BlazeBuild.buildInfoDir(file), {
                    recursive: true,
                    force: true
                });
            }
        }
    }
};
