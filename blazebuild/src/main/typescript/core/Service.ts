import type BlazeBuild from "./BlazeBuild";

abstract class Service {
    protected readonly blaze: BlazeBuild;

    public constructor(blaze: BlazeBuild) {
        this.blaze = blaze;
    }

    public async initialize(): Promise<void> {}
}

export default Service;
