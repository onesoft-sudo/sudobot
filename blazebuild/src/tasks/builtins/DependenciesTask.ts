import { existsSync } from "fs";
import AbstractTask from "../../core/AbstractTask";
import { Caching, CachingMode } from "../../decorators/Caching";
import IO from "../../io/IO";
import { Awaitable } from "../../types/Awaitable";

@Caching(CachingMode.None)
class DependenciesTask extends AbstractTask {
    public override readonly name = "dependencies";
    public override readonly defaultDescription: string = "Resolves the project dependencies";
    public override readonly defaultGroup: string = "Dependencies";
    protected ran = false;

    public override precondition(): Awaitable<boolean> {
        if (
            !this.blaze.packageManager.packagesNeedUpdate() &&
            !this.blaze.cacheManager.noCacheFileFound() &&
            existsSync("node_modules") &&
            existsSync(".blaze/cache.json")
        ) {
            return false;
        }

        return true;
    }

    public override async execute() {
        const packageManager = this.blaze.packageManager.getPackageManager();

        if (!["bun", "npm", "yarn", "pnpm"].includes(packageManager)) {
            IO.fail(`Unsupported package manager: "${packageManager}"`);
        }

        await this.blaze.packageManager.writePackageData();
        await this.blaze.execCommand(
            `${packageManager} ${packageManager === "yarn" ? "" : "install"}`
        );

        this.ran = true;
    }

    public override async doLast() {
        if (this.ran && this.blaze.taskManager.tasks.has("afterDependencies")) {
            await this.blaze.taskManager.execute("afterDependencies");
        }
    }
}

export default DependenciesTask;
