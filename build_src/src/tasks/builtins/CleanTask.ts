import { existsSync } from "fs";
import { rm } from "fs/promises";
import AbstractTask from "../../core/AbstractTask";
import BlazeBuild from "../../core/BlazeBuild";
import { Caching, CachingMode } from "../../decorators/Caching";
import { Dependencies } from "../../decorators/Dependencies";
import { Task } from "../../decorators/Task";

@Caching(CachingMode.None)
class CleanTask extends AbstractTask {
    public override readonly name = "clean";

    @Task({ name: "cleanCaches", noPrefix: true })
    public async caches(): Promise<void> {
        const cacheFile = BlazeBuild.buildInfoDir("cache.json");

        if (existsSync(cacheFile)) {
            await this.blaze.cacheManager.rmFile();
            this.blaze.cacheManager.clear();
        }
    }

    @Dependencies("cleanCaches")
    public override async execute(): Promise<void> {
        if (existsSync(this.blaze.projectManager.buildDir)) {
            await rm(this.blaze.projectManager.buildDir, { recursive: true, force: true });
        }
    }
}

export default CleanTask;
