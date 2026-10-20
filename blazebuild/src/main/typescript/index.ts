import type { CacheManager } from "./cache/CacheManager.js";
import { Build } from "./core/Build.js";
import type { Project } from "./project/Project.js";
import type { TaskManager } from "./tasks/TaskManager.js";

export * from "./cache/CacheManager.js";
export * from "./core/Build.js";
export * from "./logging/Logger.js";
export * from "./plugins/AbstractPlugin.js";
export * from "./plugins/PluginManager.js";
export * from "./project/Project.js";
export * from "./project/ProjectManager.js";
export * from "./project/Version.js";
export * from "./shell/shell.js";
export * from "./tasks/AbstractTask.js";
export * from "./tasks/CreateTask.js";
export * from "./tasks/DeleteTask.js";
export * from "./tasks/FreeTask.js";
export * from "./tasks/ReadTask.js";
export * from "./tasks/TaskManager.js";
export * from "./tasks/TaskModifier.js";
export * from "./tasks/TaskStatus.js";
export * from "./tasks/UpdateTask.js";
export * from "./types/Awaitable.js";

export const build: Build = Build.getInstance();
export const tasks: TaskManager = build.taskManager;
export const cache: CacheManager = build.cacheManager;
export const project: Project = build.projectManager.project;
