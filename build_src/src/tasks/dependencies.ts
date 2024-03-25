import { existsSync } from "fs";
import IO from "../io/IO";
import { BuiltInTask } from "../types/BuiltInTask";

export const dependenciesTask: BuiltInTask = {
    name: "dependencies",
    if: cli => cli.packageManager.packagesNeedUpdate() || !existsSync("node_modules"),
    dependsOn: ["metadata"],
    handler: async cli => {
        const packageManager = cli.packageManager.getPackageManager();

        if (!["bun", "npm", "yarn", "pnpm"].includes(packageManager)) {
            IO.fail(`Unsupported package manager: "${packageManager}"`);
        }

        cli.execCommand(`${packageManager} ${packageManager === "yarn" ? "" : "install"}`);
    }
};
