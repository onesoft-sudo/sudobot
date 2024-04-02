import BlazeBuild from "./BlazeBuild";
import { SystemPlugin } from "./SystemPlugin";

export class PluginManager {
    public readonly plugins = new Set<SystemPlugin>();
    public constructor(protected readonly cli: BlazeBuild) {
        this.add = this.add.bind(this);
        this.load = this.load.bind(this);
    }

    public add(plugins: SystemPlugin[]): void;
    public add(...plugins: SystemPlugin[]): void;

    public add(plugin1: SystemPlugin | SystemPlugin[], ...rest: SystemPlugin[]) {
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

    public load(plugin: SystemPlugin) {
        plugin.setCLI(this.cli);
        this.plugins.add(plugin);
    }

    public createFunction() {
        return (callback: (this: this, manager: this) => void) => {
            callback.call(this, this);
        };
    }
}
