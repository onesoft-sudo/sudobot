import { existsSync } from "fs";
import { rm } from "fs/promises";
import AbstractTask from "../../core/AbstractTask";
import { Caching, CachingMode } from "../../decorators/Caching";

@Caching(CachingMode.None)
class CleanDependenciesTask extends AbstractTask {
    public override readonly name = "cleanDependencies";

    public override async execute(): Promise<void> {
        if (existsSync("node_modules")) {
            await rm("node_modules", { force: true, recursive: true });
        }
    }
}

export default CleanDependenciesTask;
