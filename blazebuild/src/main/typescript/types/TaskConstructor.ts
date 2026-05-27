import type BlazeBuild from "../core/BlazeBuild.ts";
import type AbstractTask from "../tasks/AbstractTask.ts";

export type TaskConstructor = new (blaze: BlazeBuild) => AbstractTask;
