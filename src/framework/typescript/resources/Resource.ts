import { Override } from "@framework/decorators/Override";
import { readFile } from "fs/promises";
import path from "path";

class Resource {
    protected static readonly resources = new Map<string, Resource>();

    public readonly name: string;
    public readonly buffer: Buffer<ArrayBufferLike>;

    protected constructor(name: string, buffer: Buffer<ArrayBufferLike>) {
        this.name = name;
        this.buffer = buffer;
    }

    public getString() {
        return this.buffer.toString("utf-8");
    }

    @Override
    public toString() {
        return this.getString();
    }

    public static async getResource(name: string): Promise<Resource> {
        const existing = this.resources.get(name);

        if (existing) {
            return existing;
        }

        const contents = await readFile(name);
        const resource = new Resource(path.basename(name), contents);

        this.resources.set(name, resource);
        return resource;
    }

    public static registerResource(name: string, data: Buffer<ArrayBufferLike>): Resource {
        const resource = new Resource(path.basename(name), data);
        this.resources.set(name, resource);
        return resource;
    }

    public static registerResources(
        resourceInfo: Iterable<{ name: string; data: Buffer<ArrayBufferLike> }>
    ): Array<Resource> {
        const resources = [];

        for (const info of resourceInfo) {
            resources.push(this.registerResource(info.name, info.data));
        }

        return resources;
    }
}

export default Resource;
