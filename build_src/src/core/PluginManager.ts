import BlazeBuild from "./BlazeBuild";
import { Plugin } from "./Plugin";

export class PluginManager {
    public readonly plugins = new Set<Plugin>();
    public constructor(protected readonly cli: BlazeBuild) {
        this.add = this.add.bind(this);
        this.load = this.load.bind(this);
    }

    public add(plugins: Plugin[]): void;
    public add(...plugins: Plugin[]): void;

    public add(plugin1: Plugin | Plugin[], ...rest: Plugin[]) {
        if (Array.isArray(plugin1)) {
            for (const plugin of plugin1) {
                this.load(plugin);
            }
        } else {
            this.load(plugin1);
        }

        for (const plugin of rest) {
            this.load(plugin);
        }
    }

    public load(plugin: Plugin) {
        plugin.setCLI(this.cli);
        this.plugins.add(plugin);
    }

    public createFunction() {
        return (callback: (this: this, manager: this) => void) => {
            callback.call(this, this);
        };
    }
}
