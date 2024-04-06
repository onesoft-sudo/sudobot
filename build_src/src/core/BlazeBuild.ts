import { spawn } from "child_process";
import { mkdirSync } from "fs";
import { lstat } from "fs/promises";
import path from "path";
import IO from "../io/IO";
import Logger from "../logging/Logger";
import FileSystem from "../polyfills/FileSystem";
import CleanDependenciesTask from "../tasks/builtins/CleanDependenciesTask";
import CleanTask from "../tasks/builtins/CleanTask";
import DependenciesTask from "../tasks/builtins/DependenciesTask";
import InitTask from "../tasks/builtins/InitTask";
import MetadataTask from "../tasks/builtins/MetadataTask";
import TasksTask from "../tasks/builtins/TasksTask";
import { AbstractTaskClass } from "./AbstractTask";
import { CacheManager } from "./CacheManager";
import { FileSystemManager } from "./FileSystemManager";
import { PackageManager } from "./PackageManager";
import { PluginManager } from "./PluginManager";
import { ProjectManager } from "./ProjectManager";
import { TaskManager } from "./TaskManager";

class BlazeBuild {
    private static coreTasks: (typeof AbstractTaskClass)[] = [
        InitTask,
        MetadataTask,
        DependenciesTask,
        // CleanCachesTask,
        CleanDependenciesTask,
        CleanTask,
        TasksTask
    ];
    public readonly logger = new Logger(this);
    private static instance: BlazeBuild;
    public static readonly startTime = Date.now();
    public readonly taskManager = new TaskManager(this);
    public readonly projectManager = new ProjectManager(this);
    public readonly pluginManager = new PluginManager(this);
    public readonly packageManager = new PackageManager(this);
    public readonly cacheManager = new CacheManager(this);
    public readonly fileSystemManager = new FileSystemManager(this);

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
            console.error(error);
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
        if (!(await FileSystem.exists("build.blaze.ts"))) {
            this.error("No build script found.");
        }

        this.setupGlobals();

        if (process.isBun) {
            return import(`${process.cwd()}/build.blaze.ts`);
        }

        await this.compileBuildScript();
        return import(BlazeBuild.buildInfoDir("build.blaze.js"));
    }

    private async compileBuildScript() {
        const stat = await lstat(`${process.cwd()}/build.blaze.ts`);
        const cachedModTime = this.cacheManager.get<number>("build:lastmod");

        if (cachedModTime && stat.mtimeMs <= cachedModTime) {
            return;
        }

        await this.execCommand(
            `npx tsc "${path.join(process.cwd(), "build.blaze.ts")}" "${BlazeBuild.buildInfoDir(
                "build.d.ts"
            )}" --outDir "${BlazeBuild.buildInfoDir(
                ""
            )}" --allowJs --types "node,bun" --module "commonjs" --target "es6" -m "commonjs" --lib "dom,es2022" --noEmitOnError --skipLibCheck --esModuleInterop`
        );

        this.cacheManager.set("build:lastmod", stat.mtimeMs);
    }

    private setupGlobals() {
        const record = global as Record<string, unknown>;

        record.tasks = this.taskManager;
        record.println = function println(message: string) {
            IO.println(message);
        };
        record.project = this.projectManager.createProxy();
        record.plugins = this.pluginManager.createFunction();
        record.x = (command: string) => {
            const packageManager = this.packageManager.getPackageManager();

            return this.execCommand(
                `${
                    packageManager === "pnpm"
                        ? "pnpm exec"
                        : packageManager === "bun"
                        ? "bun x"
                        : "npx"
                } ${command}`
            );
        };

        this.packageManager.createFunctions(record);
    }

    public async run() {
        await this.onStart();

        try {
            await this.importBuildScript();
            await this.taskManager.execute("init");
        } catch (error) {
            IO.println("An error occurred while running the build script.");
            console.error(error);
            IO.fail(`${error}`);
        }

        await this.onEnd();
    }

    private async onEnd() {
        await this.cacheManager.write();
        await this.fileSystemManager.writeFileCache();
    }

    private async onStart() {
        await this.cacheManager.read();
        await this.fileSystemManager.readCacheFile();
    }

    public loadBuiltInTasks() {
        for (const Task of BlazeBuild.coreTasks) {
            this.taskManager.register(Task);
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
        if (!process.stdin.isTTY) {
            console.log(`Running command: ${command}`);
        }

        const proc = spawn(command, {
            shell: true,
            stdio: "inherit"
        });
        //
        // proc.stdout.on("data", data => {
        //     const buffer = IO.getProgressBuffer();
        //     buffer?.fill();
        //     process.stdout.write(data.toString());
        //     buffer?.render();
        // });
        //
        // proc.stderr.on("data", data => {
        //     const buffer = IO.getProgressBuffer();
        //     buffer?.fill();
        //     process.stdout.write(data.toString());
        //     buffer?.render();
        // });

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
