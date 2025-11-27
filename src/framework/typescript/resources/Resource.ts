import { Override } from "@framework/decorators/Override";
import { hasBundleData } from "@framework/utils/bundle";
import { readFile } from "fs/promises";
import path from "path";

class Resource<T = unknown> {
    protected static readonly resources = new Map<string, Resource>();
    protected static readonly resourcePaths: string[] = [];

    static {
        if (!hasBundleData()) {
            this.resourcePaths.push(path.join(__dirname, "../../resources"));
        }
    }

    public readonly name: string;
    public readonly data: T;

    protected constructor(name: string, data: T) {
        this.name = name;
        this.data = data;
    }

    public getJSONObject() {
        const data = Buffer.isBuffer(this.data) ? null : this.data;

        if (data === null) {
            throw new TypeError("This resource cannot be represented as a JSON object!");
        }

        return data;
    }

    public getBuffer() {
        const data =
            typeof this.data === "string" ? Buffer.from(this.data) : Buffer.isBuffer(this.data) ? this.data : null;

        if (data === null) {
            throw new TypeError("This resource cannot be represented as buffer!");
        }

        return data;
    }

    public getString(defaultValue?: string) {
        const data =
            typeof this.data === "string" ? this.data : Buffer.isBuffer(this.data) ? this.data.toString("utf-8") : null;

        if (data === null && defaultValue === undefined) {
            throw new TypeError("This resource cannot be represented as string!");
        }

        return data ?? defaultValue;
    }

    @Override
    public toString() {
        return this.getString("[Resource]");
    }

    public static async getResource<T>(name: string): Promise<Resource<T>> {
        const existing = this.resources.get(name);

        if (existing) {
            return existing as Resource<T>;
        }

        for (const resourcePath of this.resourcePaths) {
            let contents;

            try {
                contents = await readFile(
                    path.join(resourcePath, name),
                    name.endsWith(".txt") || name.endsWith(".json") ? "utf-8" : undefined
                );
            } catch {
                continue;
            }

            const resource = new Resource(name, name.endsWith(".json") ? JSON.parse(contents as string) : contents);
            this.resources.set(name, resource);
            return resource as Resource<T>;
        }

        throw new Error(`Resource '${name}' not found`);
    }

    public static registerResource<T>(name: string, data: T): Resource<T> {
        const resource = new Resource(path.basename(name), data);
        this.resources.set(name, resource);
        return resource;
    }

    public static registerResources(resourceInfo: Iterable<{ name: string; data: unknown }>): Array<Resource<unknown>> {
        const resources = [];

        for (const info of resourceInfo) {
            resources.push(this.registerResource(info.name, info.data));
        }

        return resources;
    }

    public static registerResourcePaths(...paths: string[]) {
        this.resourcePaths.push(...paths);
    }
}

export default Resource;
