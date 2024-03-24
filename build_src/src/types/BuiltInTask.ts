import type BlazeBuild from "../core/BlazeBuild";
import { Awaitable } from "./Awaitable";

export type BuiltInTask = {
    name: string;
    dependsOn?: string[];
    handler: (cli: BlazeBuild) => Awaitable<void>;
};
