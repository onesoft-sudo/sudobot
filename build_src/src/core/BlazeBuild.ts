import { spawn } from "child_process";
import { mkdirSync } from "fs";
import path from "path";
import IO from "../io/IO";
import Logger from "../logging/Logger";
import FileSystem from "../polyfills/FileSystem";
import { cleanTask } from "../tasks/clean";
import { dependenciesTask } from "../tasks/dependencies";
import { initTask } from "../tasks/init";
import { metadataTask } from "../tasks/metadata";
import { tasksTask } from "../tasks/tasks";
import { BuiltInTask } from "../types/BuiltInTask";
import { PackageManager } from "./PackageManager";
import { PluginManager } from "./PluginManager";
import { ProjectManager } from "./ProjectManager";
import { Task } from "./Task";
import { TaskManager } from "./TaskManager";

class BlazeBuild {
    private static builtInTasks: BuiltInTask[] = [
        initTask,
        cleanTask,
        tasksTask,
        metadataTask,
        dependenciesTask
    ];
    public readonly logger = new Logger(this);
    private static instance: BlazeBuild;
    public static readonly startTime = Date.now();
    public readonly tasks = new Map<string, Task>();
    public readonly executedTasks: string[] = [];
    public readonly taskManager = new TaskManager(this);
    public readonly projectManager = new ProjectManager(this);
    public readonly pluginManager = new PluginManager(this);
    public readonly packageManager = new PackageManager(this);

    private constructor() {}

    public async setup() {
        process.on("beforeExit", code => {
            IO.getProgressBuffer()?.end();
            if (code === 0) {
                this.logger.buildSuccess();
            } else {
                this.logger.buildFailed();
            }
        });

        const errorHandler = (error: unknown) => {
            IO.getProgressBuffer()?.end();
            this.logger.error(error as Error);
            this.logger.buildFailed();
            process.exit(-1);
        };

        process.on("uncaughtException", errorHandler);
        process.on("unhandledRejection", errorHandler);
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

        if (process.isBun) {
            return import(`${process.cwd()}/build.ts`);
        }

        await this.execCommand(
            `npx tsc "${path.join(process.cwd(), "build.ts")}" "${BlazeBuild.buildInfoDir(
                "build.d.ts"
            )}" --outDir "${BlazeBuild.buildInfoDir(
                ""
            )}" --allowJs --types "node,bun" --module "commonjs" --target "es6" -m "commonjs" --lib "dom,es2022" --noEmitOnError --skipLibCheck --esModuleInterop`
        );

        return import(BlazeBuild.buildInfoDir("build.js"));
    }

    private setupGlobals() {
        const record = global as Record<string, unknown>;

        record.tasks = this.taskManager;
        record.println = function println(message: string) {
            IO.println(message);
        };
        record.project = this.projectManager.createProxy();
        record.plugins = this.pluginManager.createFunction();

        this.packageManager.createFunctions(record);
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
                this.taskManager.register(task.name, task.dependsOn, handler, task.if);
                continue;
            }

            this.taskManager.register(task.name, [], handler, task.if);
        }
    }

    public static buildInfoDir(file: string) {
        const dir = path.join(process.cwd(), ".blaze");

        if (!dir) {
            mkdirSync(dir);
        }

        return path.resolve(dir, file);
    }

    public async execCommand(command: string) {
        const proc = spawn(command, {
            shell: true,
            stdio: "pipe"
        });

        proc.stdout.on("data", data => {
            const buffer = IO.getProgressBuffer();
            buffer?.fill();
            process.stdout.write(data.toString());
            buffer?.render();
        });

        proc.stderr.on("data", data => {
            const buffer = IO.getProgressBuffer();
            buffer?.fill();
            process.stdout.write(data.toString());
            buffer?.render();
        });

        return new Promise<void>((resolve, reject) => {
            proc.on("close", code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command exited with code ${code}`));
                }
            });
        });
    }
}

export default BlazeBuild;
