import CacheManager from "../cache/CacheManager";
import MissingBuildScriptError from "../errors/MissingBuildScriptError";
import TaskNotFoundError from "../errors/TaskNotFoundError";
import IO from "../io/IO";
import BuildScriptManager from "../script/BuildScriptManager";
import TaskManager from "../tasks/TaskManager";
import type Manager from "./Manager";

class Blaze {
    private static readonly defaultTaskName = "build";
    public readonly cacheManager = new CacheManager(this);
    public readonly buildScriptManager = new BuildScriptManager(this);
    public readonly taskManager = new TaskManager(this);
    private readonly managers: Manager[] = [
        this.buildScriptManager,
        this.cacheManager,
        this.taskManager
    ];

    private static _instance: Blaze;

    private constructor() {
        Blaze._instance = this;
    }

    public static getInstance() {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new Blaze();
        return this._instance;
    }

    public async boot() {
        for (const manager of this.managers) {
            if (manager.boot) {
                await manager.boot();
                IO.debug(`Booted ${manager.constructor.name}`);
            }
        }
    }

    public async run() {
        try {
            await this.buildScriptManager.loadBuildScript();
        } catch (error) {
            if (error instanceof MissingBuildScriptError) {
                IO.println(error.message);
                IO.buildFailed();
                IO.exit(1);
            }

            IO.error(error);
        }

        const taskNames =
            process.argv.length >= 3 ? process.argv.slice(2) : [Blaze.defaultTaskName];

        try {
            for (const taskName of taskNames) {
                await this.taskManager.executeTask(taskName);
            }
        } catch (error) {
            if (error instanceof TaskNotFoundError) {
                IO.println(`Task '${error.getTaskName()}' could not be found!`);
                IO.buildFailed();
                IO.exit(1);
            }

            IO.error(error);
        }

        IO.buildSuccessful();
    }
}

export default Blaze;
