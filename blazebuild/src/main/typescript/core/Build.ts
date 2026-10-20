import { CacheManager } from "../cache/CacheManager.js";
import { Logger } from "../logging/Logger.js";
import { ProjectManager } from "../project/ProjectManager.js";
import { TaskManager } from "../tasks/TaskManager.js";

export type BlazeOptions = {
    help?: boolean;
    version?: boolean;
    dryrun?: boolean;
    graph?: boolean;
};

export class Build {
    private static self: Build | null = null;

    public readonly options: BlazeOptions;
    public readonly taskManager: TaskManager;
    public readonly cacheManager: CacheManager;
    public readonly projectManager: ProjectManager;
    public readonly logger: Logger;

    public constructor(options: BlazeOptions) {
        this.options = options;
        this.logger = new Logger(this);
        this.taskManager = new TaskManager(this);
        this.cacheManager = new CacheManager(this);
        this.projectManager = new ProjectManager(this);

        if (!Build.self) {
            Build.self = this;
        }
    }

    public static getInstance() {
        if (!this.self) {
            throw new TypeError("No BlazeBuild instance is available yet");
        }

        return this.self;
    }

    public setup() {
        Object.defineProperty(globalThis, "blaze", { value: this });

        let err = false;

        process.on("exit", async code => {
            if (err) {
                return;
            }

            this.cacheManager.saveToDiskSync();

            if (code) {
                this.logger.printBuildFailed();
            } else {
                this.logger.printBuildSuccess();
            }
        });

        const errorHandler = (error: unknown) => {
            err = true;
            console.error("Uncaught", error);
            this.logger.printBuildFailed();
            process.exit(1);
        };

        process.on("uncaughtException", errorHandler);
        process.on("unhandledRejection", errorHandler);
    }

    public async loadBuildScript() {
        const script = this.projectManager.getBuildScriptPath();
        await import(script);
    }

    public async execute(taskNames: string[]) {
        await this.cacheManager.loadFromDisk();
        await this.loadBuildScript();

        for (const taskName of taskNames) {
            await this.taskManager.execute(taskName);
        }

        await this.taskManager.teardown();
    }
}
