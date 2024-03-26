import { existsSync } from "fs";
import { BuiltInTask } from "../types/BuiltInTask";
import { rm } from "fs/promises";

export const cleanDepsTask: BuiltInTask = {
    name: "cleanDeps",
    handler: async () => {
        if (existsSync("node_modules")) {
            await rm("node_modules", { force: true, recursive: true });
        }
    }
};
