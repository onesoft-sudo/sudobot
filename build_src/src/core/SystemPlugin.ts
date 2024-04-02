import { Awaitable } from "../types/Awaitable";
import BlazeBuild from "./BlazeBuild";
import { PackageData } from "./PackageManager";

export class SystemPlugin {
    private _cli?: BlazeBuild;

    protected get cli() {
        if (!this._cli) {
            throw new Error("CLI is not set.");
        }

        return this._cli;
    }

    public setCLI(cli: BlazeBuild) {
        this._cli = cli;
    }

    public onPackageJSONAvailable(_data: PackageData): Awaitable<void> {}

    protected addTask(name: string, dependencies: string[], task: () => Awaitable<void>) {
        this.cli.taskManager.register(name, dependencies, task);
    }
}
