import chalk from "chalk";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import packageJson from "../../../../package.json";
import Logger from "../log/Logger";
import BlazePlugin from "../plugins/BlazePlugin";
import CacheManager from "../services/CacheManager";
import ProjectManager from "../services/ProjectManager";
import TaskManager from "../services/TaskManager";
import type AbstractTask from "../tasks/AbstractTask";

export type BlazeOptions = {
    help?: boolean;
    version?: boolean;
    dryrun?: boolean;
    graph?: boolean;
};

export type SettingData = {
    build: {
        metadataDirectory: string;
        metadataDirectoryUseNamespacing: boolean;
    };
};

class BlazeBuild {
    public static readonly version: string = packageJson.version;
    private readonly startTime: number = Date.now();
    public readonly logger = new Logger();
    public readonly projectManager = new ProjectManager(this);
    public readonly cacheManager = new CacheManager(this);
    public readonly taskManager = new TaskManager(this);
    public readonly options: Readonly<BlazeOptions>;

    public settingsScriptLastModifiedTime: number = 0;
    public buildScriptLastModifiedTime: number = 0;

    public readonly settings: Readonly<SettingData> = {
        build: {
            metadataDirectory: ".blazebuild",
            metadataDirectoryUseNamespacing: true
        }
    };

    public constructor(options: BlazeOptions = {}) {
        this.options = options;

        process.on("exit", code => {
            if (code !== 0) {
                console.error(
                    `\n${chalk.red.bold("BUILD FAILED")} ${chalk.white(`in ${this.formatDuration(Date.now() - this.startTime)}`)}`
                );
            }
        });
    }

    public async loadBuildSrc(): Promise<void> {
        const buildSrcPath = path.resolve(process.cwd(), "build_src");

        if (!existsSync(buildSrcPath)) {
            return;
        }

        const packageJson = path.resolve(buildSrcPath, "package.json");
        const entry = JSON.parse(await readFile(packageJson, "utf8")).main;

        if (!entry) {
            throw new Error("No entry point found in buildSrc package.json.");
        }

        const entryPath = path.resolve(buildSrcPath, entry);
        const { default: buildPluginClass } = (await import(entryPath, {
            with: { type: "module" }
        })) as {
            default: new (blaze: BlazeBuild) => BlazePlugin;
        };

        if (typeof buildPluginClass !== "function") {
            throw new Error(
                "Invalid build plugin. The entry point must export a BlazePlugin class."
            );
        }

        await this.addPlugin(buildPluginClass);
    }

    public async addPlugin(
        plugin: new (blaze: BlazeBuild) => BlazePlugin
    ): Promise<void> {
        const buildPlugin = new plugin(this);

        if (!(buildPlugin instanceof BlazePlugin)) {
            throw new Error(
                "Invalid build plugin. The entry point must export a BlazePlugin class."
            );
        }

        for (const task of await buildPlugin.tasks()) {
            this.taskManager.registerClass(
                task as new (blaze: BlazeBuild) => AbstractTask
            );
        }

        await buildPlugin.boot();
    }

    public async initialize(
        settingsScriptLastModifiedTime: number,
        buildScriptLastModifiedTime: number
    ): Promise<void> {
        this.settingsScriptLastModifiedTime = settingsScriptLastModifiedTime;
        this.buildScriptLastModifiedTime = buildScriptLastModifiedTime;

        await this.projectManager.initialize();
        await this.cacheManager.initialize();
        await this.taskManager.initialize();
    }

    public async execute(taskNames: string[]): Promise<void> {
        let totalCount = 0,
            executedCount = 0,
            upToDateCount = 0;

        for (const taskName of taskNames) {
            try {
                const graph = await this.taskManager.buildGraph(taskName);

                if (this.options.graph) {
                    console.log("Task graph:");
                    this.taskManager.printGraph(taskName, graph);
                }

                if (this.options.dryrun) {
                    this.logger.info(`Dry run: ${taskName}`);
                    continue;
                }

                const {
                    executedCount: currentExecutedCount,
                    totalCount: currentTotalCount,
                    upToDateCount: currentUpToDatCount
                } = await this.taskManager.execute(taskName);

                totalCount += currentTotalCount;
                executedCount += currentExecutedCount;
                upToDateCount += currentUpToDatCount;
            } catch (error) {
                this.logger.error(`Error running task "${taskName}":`);
                console.error(error);
                process.exit(1);
            }
        }

        await this.cacheManager.syncTaskCache();

        console.info(
            `\n${chalk.green.bold("BUILD SUCCESSFUL")} in ${this.formatDuration(Date.now() - this.startTime)}`
        );

        let summary = `${chalk.whiteBright.bold(totalCount)} task${
            totalCount > 1 ? "s" : ""
        } total: `;

        if (executedCount > 0) {
            summary += `${chalk.green(executedCount)} executed`;
        }

        if (upToDateCount > 0) {
            summary += `${
                summary.endsWith(" ") ? "" : ", "
            }${chalk.yellow(upToDateCount)} up-to-date`;
        }

        console.info(summary);
    }

    private formatDuration(duration: number): string {
        const milliseconds = duration % 1000;
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / (1000 * 60)) % 60);
        const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

        if (
            milliseconds === 0 &&
            seconds === 0 &&
            minutes === 0 &&
            hours === 0
        ) {
            return "0ms";
        }

        return (
            (hours > 0 ? `${hours}h ` : "") +
            (minutes > 0 ? `${minutes}m ` : "") +
            (seconds > 0 ? `${seconds}s ` : "") +
            (milliseconds > 0 ? `${milliseconds}ms` : "")
        );
    }
}

export default BlazeBuild;
