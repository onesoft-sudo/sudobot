import { existsSync } from "fs";
import { rm } from "fs/promises";
import { BuiltInTask } from "../types/BuiltInTask";

export const cleanTask: BuiltInTask = {
    name: "clean",
    dependsOn: ["cleanCaches"],
    handler: async cli => {
        if (existsSync(cli.projectManager.buildDir)) {
            await rm(cli.projectManager.buildDir, { recursive: true, force: true });
        }
    }
};
