import IO from "../io/IO";
import Logger from "../logging/Logger";
import FileSystem from "../polyfills/FileSystem";
import { cleanTask } from "../tasks/clean";
import { initTask } from "../tasks/init";
import { tasksTask } from "../tasks/tasks";
import { BuiltInTask } from "../types/BuiltInTask";
import { PluginManager } from "./PluginManager";
import { ProjectManager } from "./ProjectManager";
import { Task } from "./Task";
import { TaskManager } from "./TaskManager";

class BlazeBuild {
    private static builtInTasks: BuiltInTask[] = [initTask, cleanTask, tasksTask];
    public readonly logger = new Logger(this);
    private static instance: BlazeBuild;
    public static readonly startTime = Date.now();
    public readonly tasks = new Map<string, Task>();
    public readonly executedTasks: string[] = [];
    public readonly taskManager = new TaskManager(this);
    public readonly projectManager = new ProjectManager(this);
    public readonly pluginManager = new PluginManager(this);

    private constructor() {}

    public async setup() {
        process.on("beforeExit", code => {
            if (code === 0) {
                this.logger.buildSuccess();
            } else {
                this.logger.buildFailed();
            }
        });

        process.on("uncaughtException", error => {
            this.logger.error(`${error}`);
            this.logger.buildFailed();
            process.exit(-1);
        });

        process.on("unhandledRejection", error => {
            this.logger.error(`${error}`);
            this.logger.buildFailed();
            process.exit(-1);
        });

        this.loadBuiltInTasks();
    }

    public static getInstance() {
        if (!BlazeBuild.instance) {
            BlazeBuild.instance = new BlazeBuild();
        }

        return BlazeBuild.instance;
    }

    private error(message: string): never {
        IO.fail(message);
    }

    private async importBuildScript() {
        if (!(await FileSystem.exists("build.ts"))) {
            this.error("No build script found.");
        }

        this.setupGlobals();
        return import(`${process.cwd()}/build.ts`);
    }

    private setupGlobals() {
        const record = global as Record<string, unknown>;

        record.tasks = this.taskManager;
        record.println = function println(message: string) {
            IO.println(message);
        };
        record.project = this.projectManager.createProxy();
        record.plugins = this.pluginManager;
    }

    public async run() {
        try {
            await this.importBuildScript();
            await this.taskManager.execute("init");
        } catch (error) {
            this.error(`${error}`);
        }
    }

    public loadBuiltInTasks() {
        for (const task of BlazeBuild.builtInTasks) {
            const handler = () => task.handler(this);

            if (task.dependsOn) {
                this.taskManager.register(task.name, task.dependsOn, handler);
                continue;
            }

            this.taskManager.register(task.name, handler);
        }
    }
}

export default BlazeBuild;
