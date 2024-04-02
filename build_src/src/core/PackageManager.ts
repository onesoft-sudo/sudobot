import deepmerge from "deepmerge";
import IO from "../io/IO";
import FileSystem from "../polyfills/FileSystem";
import { Manager } from "./Manager";

export type PackageData = {
    name?: string;
    version?: string;
    description?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    author?: {
        name: string;
        email?: string;
        url?: string;
    };
};

export type PackageManagerName = "npm" | "bun" | "pnpm" | "yarn";

export class PackageManager extends Manager {
    public static readonly defaults: PackageData = {
        dependencies: {},
        devDependencies: {},
        optionalDependencies: {},
        peerDependencies: {}
    };
    private packageData = PackageManager.defaults;
    private changed = false;
    private packageManager: PackageManagerName = "npm";

    public async readPackageJSON(): Promise<PackageData> {
        const metadata = this.cli.projectManager.metadata;
        const path = metadata.packageFilePath;
        const defaults = {
            name: metadata.name,
            version: metadata.version,
            description: metadata.description,
            author: metadata.author
        };

        if (!(await FileSystem.exists(path))) {
            return {
                ...defaults
            };
        }

        try {
            const json = await FileSystem.readFileContents(path, { json: true });

            return {
                ...(json as PackageData),
                ...defaults
            } as PackageData;
        } catch (error) {
            IO.fail("Failed to read file: " + path);
        }
    }

    public async loadPackageJSON() {
        const original = await this.readPackageJSON();
        this.packageData = deepmerge(
            PackageManager.defaults,
            deepmerge(
                {
                    ...original,
                    dependencies: {},
                    devDependencies: {},
                    peerDependencies: {},
                    optionalDependencies: {}
                },
                this.packageData
            )
        );

        for (const plugin of this.cli.pluginManager.plugins) {
            await plugin.onPackageJSONAvailable(this.packageData);
        }
    }

    public async writePackageData() {
        const { metadata } = this.cli.projectManager;
        const path = metadata.packageFilePath;
        const data = this.packageData ?? PackageManager.defaults;
        const { dependencies, devDependencies, peerDependencies, optionalDependencies, ...rest } =
            data;

        await FileSystem.writeFileContents(
            path,
            JSON.stringify(
                {
                    name: metadata.name,
                    version: metadata.version,
                    description: metadata.description,
                    author: metadata.author,
                    ...rest,
                    dependencies,
                    devDependencies,
                    peerDependencies,
                    optionalDependencies
                } satisfies typeof data,
                null,
                4
            ),
            false
        );
    }

    private compareDependencies(current: Record<string, string>, old: Record<string, string>) {
        const keys = Object.keys(current);
        const oldKeys = Object.keys(old);

        if (keys.length !== oldKeys.length) {
            return true;
        }

        for (const key of keys) {
            if (current[key] !== old[key]) {
                return true;
            }
        }

        return false;
    }

    public getPackageManager() {
        return this.packageManager;
    }

    public createFunctions(global: Record<string, unknown>) {
        global.packageManager = (name: PackageManagerName) => {
            this.packageManager = name;
        };

        global.dependencies = (callback: (this: this, manager: this) => void) => {
            this.packageData.dependencies ??= {};
            this.packageData.devDependencies ??= {};
            this.packageData.peerDependencies ??= {};
            this.packageData.optionalDependencies ??= {};

            callback.call(this, this);

            type DepsData = {
                dependencies: Record<string, string>;
                devDependencies: Record<string, string>;
                peerDependencies: Record<string, string>;
                optionalDependencies: Record<string, string>;
            };

            const deps = this.cli.cacheManager.get<DepsData>("deps");
            const manager = this.cli.cacheManager.get<PackageManagerName>("manager");

            if (
                !deps ||
                !manager ||
                this.packageManager !== manager ||
                this.compareDependencies(this.packageData.dependencies, deps.dependencies) ||
                this.compareDependencies(this.packageData.devDependencies, deps.devDependencies) ||
                this.compareDependencies(
                    this.packageData.peerDependencies,
                    deps.peerDependencies
                ) ||
                this.compareDependencies(
                    this.packageData.optionalDependencies,
                    deps.optionalDependencies
                )
            ) {
                this.changed = true;
            }

            this.cli.cacheManager.set("deps", {
                dependencies: this.packageData.dependencies,
                devDependencies: this.packageData.devDependencies,
                peerDependencies: this.packageData.peerDependencies,
                optionalDependencies: this.packageData.optionalDependencies
            });

            this.cli.cacheManager.set("manager", this.packageManager);
        };

        const map = {
            nodeModule: "dependencies",
            devNodeModule: "devDependencies",
            optionalNodeModule: "optionalDependencies",
            peerNodeModule: "peerDependencies"
        };

        for (const fn in map) {
            global[fn] = (...args: [string, string, string] | [string, string] | [string]) => {
                const key = map[fn as keyof typeof map] as Extract<
                    keyof PackageData,
                    `${string}ependencies`
                >;

                if (!this.packageData[key]) {
                    this.packageData[key] ??= {};
                }

                let name: string;
                let version: string;
                let namespace: string | undefined;

                if (args.length === 1) {
                    const splitted = args[0].split(":");
                    name = splitted[splitted.length === 3 ? 1 : 0];
                    version = splitted[splitted.length === 3 ? 2 : 1];
                    namespace = splitted.length === 3 ? splitted[0] : undefined;
                } else if (args.length === 2) {
                    const splitted = args[0].split(":");
                    name = splitted[splitted.length === 2 ? 1 : 0];
                    namespace = splitted.length === 2 ? splitted[0] : undefined;
                    version = args[1];
                } else {
                    namespace = args[0];
                    name = args[1];
                    version = args[2];
                }

                const fullName = namespace ? `@${namespace}/${name}` : name;
                this.packageData[key]![fullName] = version;
                return true;
            };
        }
    }

    public packagesNeedUpdate() {
        return this.changed;
    }
}
