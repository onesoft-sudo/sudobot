import type BlazeBuild from "../core/BlazeBuild";
import type AbstractTask from "../tasks/AbstractTask";

export type TaskConstructor = new (blaze: BlazeBuild) => AbstractTask;
