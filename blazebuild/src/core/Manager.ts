import type BlazeBuild from "./BlazeBuild";

export abstract class Manager {
    public constructor(protected readonly cli: BlazeBuild) {}
}
