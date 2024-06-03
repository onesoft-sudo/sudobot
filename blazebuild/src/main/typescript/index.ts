import "./types/build";
import "reflect-metadata";

import AbstractTask from "./tasks/AbstractTask";
import { Task } from "./tasks/Task";
import { TaskAction } from "./tasks/TaskAction";
import { TaskDependencyGenerator } from "./tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "./tasks/TaskInputGenerator";
import { TaskOutputGenerator } from "./tasks/TaskOutputGenerator";
import IO from "./io/IO";
import { files, glob } from "./utils/glob";

export {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    TaskOutputGenerator,
    files,
    glob,
    IO
};

export * from "./types/file";
export * from "./types/project";
export * from "./types/task";
export * from "./types/utils";
