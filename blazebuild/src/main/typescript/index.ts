import "reflect-metadata";

import BlazeBuild from "./core/BlazeBuild.ts";
import { Task } from "./decorators/Task.ts";
import { TaskAction } from "./decorators/TaskAction.ts";
import { TaskDependencyGenerator } from "./decorators/TaskDependencyGenerator.ts";
import { TaskInputGenerator } from "./decorators/TaskInputGenerator.ts";
import { TaskOutputGenerator } from "./decorators/TaskOutputGenerator.ts";
import ProjectTasks from "./delegates/ProjectTasks.ts";
import Settings from "./delegates/Settings.ts";
import BlazePlugin from "./plugins/BlazePlugin.ts";
import type { Project } from "./services/ProjectManager.ts";
import AbstractTask from "./tasks/AbstractTask.ts";
import TaskContext from "./tasks/TaskContext.ts";
import type { Awaitable } from "./types/Awaitable.ts";
import type { TaskConstructor } from "./types/TaskConstructor.ts";
import { files, isInPath, x } from "./utils/helpers.ts";

const blaze = (
    globalThis as {
        __blazebuild?: BlazeBuild;
    }
).__blazebuild;

if (!blaze) {
    throw new Error(
        "BlazeBuild is not initialized. Please initialize it before using it. If you are running the build script directly, please run blazebuild instead."
    );
}

const project: Project = new Proxy(blaze.projectManager.properties, {
    get: (target, prop) => {
        if (prop in target) {
            return target[prop as keyof typeof target];
        } else {
            throw new Error(`Property ${String(prop)} does not exist.`);
        }
    },
    set: (target, prop, value) => {
        if (prop in target) {
            target[prop as keyof typeof target] = value as never;
            return true;
        } else {
            throw new Error(`Property ${String(prop)} does not exist.`);
        }
    }
});

const tasks = new ProjectTasks(blaze);
const settings = new Settings(blaze.settings);

const logger = blaze.logger;
const finalBlaze = blaze;

export {
    AbstractTask,
    finalBlaze as blaze,
    BlazePlugin,
    files,
    isInPath,
    logger,
    project,
    settings,
    Task,
    TaskAction,
    TaskContext,
    TaskDependencyGenerator,
    TaskInputGenerator,
    TaskOutputGenerator,
    tasks,
    x,
    type Awaitable,
    type TaskConstructor
};
