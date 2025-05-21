import BlazeBuild from "./core/BlazeBuild";
import ProjectTasks from "./delegates/ProjectTasks";
import Settings from "./delegates/Settings";
import type { Project } from "./services/ProjectManager";

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

const project: Project = new Proxy(blaze.projectManager.project, {
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

const tasks = new ProjectTasks(blaze.taskManager);
const settings = new Settings(blaze.settings);

const getPackages = () => {
    return {
        count: 50
    };
};

const logger = blaze.logger;

export { getPackages, logger, project, settings, tasks };
