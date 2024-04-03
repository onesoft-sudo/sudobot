import { existsSync } from "fs";
import { cp } from "fs/promises";
import path from "path";
import { BuiltInTask } from "../types/BuiltInTask";

export const dumpTypesTask: BuiltInTask = {
    name: "dumpTypes",
    if: () => !existsSync(".blaze/build.d.ts"),
    handler: async () => {
        await cp(path.resolve(__dirname, "../../templates/build.d.ts"), ".blaze/build.d.ts");
    }
};
