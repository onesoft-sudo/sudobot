import Manager from "../core/Manager";
import type { ProjectProperties } from "../exports";

class ProjectManager extends Manager {
    private _properties: Partial<ProjectProperties> = {
        description: undefined,
        name: undefined,
        structure: {
            buildOutputDirectory: "build",
            sourcesRootDirectory: "src",
            testResourcesDirectory: "tests/resources",
            testsDirectory: "tests"
        },
        version: undefined
    };

    public get properties() {
        return this._properties;
    }

    public getProxy() {
        return new Proxy(this._properties, {
            get: (target, prop) => {
                if (prop === "setProperties") {
                    return (properties: Partial<ProjectProperties>) => {
                        this._properties = {
                            ...this._properties,
                            ...properties
                        };
                    };
                }

                if (prop in target) {
                    return target[prop as keyof typeof target];
                }

                throw new Error(`Property ${String(prop)} does not exist in ProjectProperties`);
            },
            set: (target, prop, value) => {
                target[prop as keyof typeof target] = value;
                return true;
            }
        });
    }
}

export default ProjectManager;
