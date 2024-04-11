import AbstractTask from "../../core/AbstractTask";
import { Caching, CachingMode } from "../../decorators/Caching";
import IO from "../../io/IO";

@Caching(CachingMode.Incremental)
class DependenciesTask extends AbstractTask {
    public override readonly name = "dependencies";
    public override readonly defaultDescription: string = "Resolves the project dependencies";
    public override readonly defaultGroup: string = "Dependencies";
    protected ran = false;

    public override async precondition(): Promise<boolean> {
        return this.blaze.packageManager.packagesNeedUpdate();
    }

    public override async execute() {
        const packageManager = this.blaze.packageManager.getPackageManager();
        const registry = this.blaze.repositoryManager.getRepository();

        if (!["bun", "npm", "yarn", "pnpm"].includes(packageManager)) {
            IO.fail(`Unsupported package manager: "${packageManager}"`);
        }

        await this.blaze.packageManager.writePackageData();
        await this.blaze.execCommand(
            `${packageManager} ${packageManager === "yarn" ? "" : "install"}` +
                (packageManager === "bun" ? "" : ` --registry="${registry.replace(/"/g, '\\"')}"`)
        );

        this.ran = true;

        this.addInputs(this.name, this.blaze.buildScriptPath);
        this.addOutputs(this.name, `${process.cwd()}/node_modules`);
    }

    public override async doLast() {
        if (this.ran && this.blaze.taskManager.tasks.has("afterDependencies")) {
            await this.blaze.taskManager.execute("afterDependencies");
        }
    }
}

export default DependenciesTask;
