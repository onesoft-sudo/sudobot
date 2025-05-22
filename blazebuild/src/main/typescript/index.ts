import "reflect-metadata";

import BlazeBuild from "./core/BlazeBuild";
import { Task } from "./decorators/Task";
import { TaskAction } from "./decorators/TaskAction";
import { TaskDependencyGenerator } from "./decorators/TaskDependencyGenerator";
import { TaskInputGenerator } from "./decorators/TaskInputGenerator";
import { TaskOutputGenerator } from "./decorators/TaskOutputGenerator";
import ProjectTasks from "./delegates/ProjectTasks";
import Settings from "./delegates/Settings";
import BlazePlugin from "./plugins/BlazePlugin";
import type { Project } from "./services/ProjectManager";
import AbstractTask from "./tasks/AbstractTask";
import TaskContext from "./tasks/TaskContext";
import type { Awaitable } from "./types/Awaitable";
import { files, isInPath, x } from "./utils/helpers";

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

export {
    AbstractTask,
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
    type Awaitable
};
