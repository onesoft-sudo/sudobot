import { dirname } from "path";
import BlazeBuild from "./BlazeBuild";

type ProjectMetadata = {
    buildDir: string;
    name: string;
    version?: string;
    description?: string;
    srcDir: string;
    tsconfigPath?: string;
};

const defaultSettings: ProjectMetadata = {
    buildDir: "./build",
    name: dirname(process.cwd()),
    srcDir: "./src",
    description: undefined,
    version: undefined,
    tsconfigPath: undefined
};

export class ProjectManager {
    private _metadata: ProjectMetadata = defaultSettings;
    public constructor(protected readonly cli: BlazeBuild) {}

    public get metadata() {
        return this._metadata;
    }

    public get buildDir() {
        return this.metadata.buildDir;
    }

    public createProxy() {
        return new Proxy(this._metadata, {
            get(target, prop) {
                if (prop in target) {
                    return target[prop as keyof typeof target];
                }

                throw new Error(
                    `Property "${String(prop)}" does not exist on type "ProjectMetadata"`
                );
            },
            set(target, prop, value) {
                if (prop in target) {
                    target[prop as keyof typeof target] = value;
                    return true;
                }

                throw new Error(
                    `Property "${String(prop)}" does not exist on type "ProjectMetadata"`
                );
            }
        });
    }
}
