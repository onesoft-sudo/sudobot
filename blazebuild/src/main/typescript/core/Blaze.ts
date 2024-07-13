import chalk from "chalk";
import { parseArgs } from "util";
import { version } from "../../../../package.json";
import CacheManager from "../cache/CacheManager";
import MissingBuildScriptError from "../errors/MissingBuildScriptError";
import TaskNotFoundError from "../errors/TaskNotFoundError";
import IO from "../io/IO";
import ProjectManager from "../project/ProjectManager";
import BuildScriptManager from "../script/BuildScriptManager";
import TaskManager from "../tasks/TaskManager";
import type Manager from "./Manager";

class Blaze {
    private static readonly defaultTaskName = "build";
    public readonly cacheManager = new CacheManager(this);
    public readonly buildScriptManager = new BuildScriptManager(this);
    public readonly taskManager = new TaskManager(this);
    public readonly projectManager = new ProjectManager(this);
    private readonly managers: Manager[] = [
        this.buildScriptManager,
        this.cacheManager,
        this.taskManager,
        this.projectManager
    ];
    private static _instance: Blaze;
    private _cliArgs: string[] = [];

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
        process.on("uncaughtException", error => {
            IO.fatal(error);
        });

        process.on("unhandledRejection", error => {
            IO.fatal(error);
        });

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
                IO.error(error.message);
                IO.buildFailed();
                IO.exit(1);
            }

            IO.fatal(error);
        }

        const { positionals, values } = parseArgs({
            args: process.argv.slice(2),
            options: {
                help: {
                    type: "boolean",
                    short: "h"
                },
                version: {
                    type: "boolean",
                    short: "v"
                },
                quiet: {
                    type: "boolean",
                    short: "q"
                },
                debug: {
                    type: "boolean"
                }
            },
            allowPositionals: true,
            strict: false
        });

        if (await this.handleCLIArgs(positionals, values)) {
            IO.exit(0);
        }

        const taskName = positionals.at(0) ?? Blaze.defaultTaskName;

        if (!taskName) {
            IO.error("No task name provided!");
            IO.buildFailed();
            IO.exit(1);
        }

        const taskNamePosition = process.argv.indexOf(taskName);
        const doubleDashPosition = process.argv.indexOf("--");

        if (doubleDashPosition !== -1 && doubleDashPosition < taskNamePosition) {
            IO.error("Task name must come before `--'");
            IO.buildFailed();
            IO.exit(1);
        }

        let end = false;

        this._cliArgs = process.argv.slice(2).filter(arg => {
            if (end) {
                return true;
            }

            if (arg === "--" || arg === taskName) {
                end = true;
                return false;
            }

            if (arg.startsWith("-")) {
                return false;
            }
        });

        try {
            await this.taskManager.executeTask(taskName);
        } catch (error) {
            if (error instanceof TaskNotFoundError) {
                IO.error(error.message);
                IO.debug(error.stack ?? "[No stack]");
                IO.buildFailed();
                IO.exit(1);
            }

            IO.fatal(error);
        }

        IO.buildSuccessful();
    }

    public get cliArgs() {
        return this._cliArgs;
    }

    private async handleCLIArgs(positionals: string[], values: Record<string, any>) {
        if (values.help) {
            this.printHelp();
            return true;
        }

        if (values.version) {
            this.printVersion();
            return true;
        }

        if (values.quiet && values.debug) {
            IO.error("Cannot enable both quiet and debug modes at the same time!");
            IO.buildFailed();
            return true;
        }

        if (values.quiet) {
            IO.setQuiet(true);
        }

        if (values.debug) {
            process.env.BLAZE_DEBUG = "1";
        }

        return false;
    }

    private printLogo() {
        IO.println(
            chalk.white.bold(
                `      
                \a____  _               ____        _ _     _ 
                | __ )| | __ _ _______| __ ) _   _(_) | __| |
                |  _ \\| |/ _\` |_  / _ \\  _ \\| | | | | |/ _\` |
                | |_) | | (_| |/ /  __/ |_) | |_| | | | (_| |
                |____/|_|\\__,_/___\\___|____/ \\__,_|_|_|\\__,_|                                                

            `
                    .replace(/^\s+/g, "")
                    .replace(/\n\s*/g, "\n")
                    .replace(/\a/g, " ")
            )
        );
    }

    private printHelp() {
        this.printLogo();
        IO.println(chalk.bold.blue(`BlazeBuild version ${version}`));
        IO.newline();
        IO.println(chalk.white.bold("Usage:"));
        IO.println("  blazew [options] [command] [args...] [-- [fargs...]]");
        IO.newline();
        IO.println(chalk.white.bold("Options:"));
        IO.println("  --help,    -h    Show this help message and exit.");
        IO.println("  --version, -v    Show the version number and exit.");
        IO.println("  --quiet,   -q    Disable output.");
        IO.println("  --debug          Enable debug mode.");
    }

    private printVersion() {
        IO.println(`BlazeBuild ${version}`);
    }
}

export default Blaze;
