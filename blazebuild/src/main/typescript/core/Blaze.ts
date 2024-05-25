import CacheManager from "../cache/CacheManager";
import TaskNotFoundError from "../errors/TaskNotFoundError";
import IO from "../io/IO";
import BuildScriptManager from "../script/BuildScriptManager";
import TaskManager from "../tasks/TaskManager";
import type Manager from "./Manager";

class Blaze {
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
            }
        }
    }

    public async run() {
        try {
            await this.taskManager.executeTask("build");
        } catch (error) {
            if (error instanceof TaskNotFoundError) {
                IO.println(`Task '${error.getTaskName()}' could not be found!`);
                IO.buildFailed();
                return;
            }
        }

        IO.buildSuccessful();
    }
}

export default Blaze;
