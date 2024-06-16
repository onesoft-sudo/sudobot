import "./types/build";
import "reflect-metadata";

import AbstractTask from "./tasks/AbstractTask";
import BlazePlugin from './plugins/BlazePlugin';
import { Task } from "./tasks/Task";
import { TaskAction } from "./tasks/TaskAction";
import { TaskDependencyGenerator } from "./tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "./tasks/TaskInputGenerator";
import { TaskOutputGenerator } from "./tasks/TaskOutputGenerator";
import IO from "./io/IO";
import { files, glob } from "./utils/glob";
import File from './io/File';
import FileAlreadyExistsError from './io/FileAlreadyExistsError';
import FileIOError from './io/FileIOError';
import FileNotFoundError from './io/FileNotFoundError';
import FileWriter from './io/FileWriter';

export {
    AbstractTask,
    BlazePlugin,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    TaskOutputGenerator,
    files,
    glob,
    IO,
    File,
    FileIOError,
    FileAlreadyExistsError,
    FileNotFoundError,
    FileWriter
};

export * from "./types/file";
export * from "./types/project";
export * from "./types/task";
export * from "./types/utils";
