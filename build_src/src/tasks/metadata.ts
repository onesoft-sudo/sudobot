import { existsSync } from "fs";
import { lstat, readFile, writeFile } from "fs/promises";
import BlazeBuild from "../core/BlazeBuild";
import { BuiltInTask } from "../types/BuiltInTask";

export const metadataTask: BuiltInTask = {
    name: "metadata",
    async if(cli) {
        const file = BlazeBuild.buildInfoDir("meta_lastupdate");

        if (!existsSync(file)) {
            return true;
        }

        const lastUpdate = parseInt(await readFile(file, { encoding: "utf-8" }));
        const packageStat = await lstat(cli.projectManager.metadata.packageFilePath);
        const buildFileStat = await lstat("build.ts");

        return (
            isNaN(lastUpdate) ||
            lastUpdate < packageStat.mtimeMs ||
            lastUpdate < buildFileStat.mtimeMs
        );
    },
    handler: async cli => {
        await cli.packageManager.writePackageData();
        const file = BlazeBuild.buildInfoDir("meta_lastupdate");
        await writeFile(file, `${Date.now()}`);
    }
};
