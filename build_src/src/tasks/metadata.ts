import { lstat } from "fs/promises";
import { BuiltInTask } from "../types/BuiltInTask";

export const metadataTask: BuiltInTask = {
    name: "metadata",
    async if(cli) {
        const lastUpdate = cli.cacheManager.get<number | undefined>("metadata:lastupdate");

        if (!lastUpdate) {
            return true;
        }

        const packageStat = await lstat(cli.projectManager.metadata.packageFilePath);
        const buildFileStat = await lstat("build.blaze.ts");

        return (
            isNaN(lastUpdate) ||
            lastUpdate < packageStat.mtimeMs ||
            lastUpdate < buildFileStat.mtimeMs
        );
    },
    handler: async cli => {
        await cli.packageManager.writePackageData();
        cli.cacheManager.set("metadata:lastupdate", Date.now());
    }
};
