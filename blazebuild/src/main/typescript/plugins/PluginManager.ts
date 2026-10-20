import path from "node:path";
import type { Build } from "../core/Build.js";
import type { AbstractPlugin } from "./AbstractPlugin.js";

export type PluginConstructor = new (build: Build) => AbstractPlugin;

export class PluginManager {
    private readonly plugins = new Map<PluginConstructor, AbstractPlugin>();
    public constructor(private readonly build: Build) {}

    public async register(pluginConstructor: PluginConstructor) {
        this.build.logger.printDebugMessage(`Registering plugin: ${pluginConstructor.name}`);

        const plugin = new pluginConstructor(this.build);
        this.plugins.set(pluginConstructor, plugin);
        await plugin.setup?.();

        for (const task of await plugin.tasks()) {
            this.build.taskManager.register(task);
        }

        return plugin;
    }

    public async loadBuildSrcPlugin() {
        const buildSrcPluginFile = path.join(
            this.build.projectManager.getBuildSrcDirectoryPath(),
            "build/main/typescript/BuildSrcPlugin.js"
        );

        const { default: BuildSrcPlugin } = await import(buildSrcPluginFile);
        await this.register(BuildSrcPlugin);
    }
}
