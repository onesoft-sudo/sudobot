import type BlazeBuild from "./BlazeBuild.ts";

abstract class Service {
    protected readonly blaze: BlazeBuild;

    public constructor(blaze: BlazeBuild) {
        this.blaze = blaze;
    }

    public async initialize(): Promise<void> {}
}

export default Service;
