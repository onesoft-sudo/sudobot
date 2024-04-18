import { lstat } from "fs/promises";
import AbstractTask from "../../core/AbstractTask";
import { Caching, CachingMode } from "../../decorators/Caching";

@Caching(CachingMode.None)
class MetadataTask extends AbstractTask {
    public override readonly name = "metadata";
    public override readonly defaultDescription: string = "Builds metadata cache for the project";
    public override readonly defaultGroup: string = "Core";

    public override async precondition(): Promise<boolean> {
        const lastUpdate = this.blaze.cacheManager.get<number | undefined>("metadata:lastupdate");

        if (!lastUpdate) {
            return true;
        }

        const packageStat = await lstat(this.blaze.projectManager.metadata.packageFilePath);
        const buildFileStat = await lstat("build.blaze.ts");

        return (
            isNaN(lastUpdate) ||
            lastUpdate < packageStat.mtimeMs ||
            lastUpdate < buildFileStat.mtimeMs
        );
    }

    public override async execute(): Promise<void> {
        await this.blaze.packageManager.writePackageData();
        this.blaze.cacheManager.set("metadata:lastupdate", Date.now());
    }
}

export default MetadataTask;
