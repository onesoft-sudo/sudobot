import type { Awaitable } from "../types/Awaitable";
import type TaskContext from "./TaskContext";

export const TaskOptionSymbol = "__taskoptions";
export const PrivateTaskOptionsSymbol = "__privateTaskOptions";

class TaskControl {
    public [TaskOptionSymbol]: TaskOptions;
    public [PrivateTaskOptionsSymbol]: PrivateTaskOptions;

    public constructor(
        options: TaskOptions,
        privateOptions: PrivateTaskOptions
    ) {
        this[TaskOptionSymbol] = options;
        this[PrivateTaskOptionsSymbol] = privateOptions;
    }

    public get name(): string {
        return this[TaskOptionSymbol].name;
    }

    public get description(): string | undefined {
        return this[TaskOptionSymbol].description;
    }

    public get handler(): TaskFunction {
        return this[TaskOptionSymbol].handler || (() => {});
    }

    public async run(context: TaskContext): Promise<void> {
        await this.handler(context);
    }

    public toString(): string {
        return `Task(${this.name})`;
    }

    public async getDependencies(): Promise<string[]> {
        return [
            ...((await this[PrivateTaskOptionsSymbol].getDependencies?.()) ??
                this[TaskOptionSymbol].dependencies ??
                []),
            ...(this[PrivateTaskOptionsSymbol].dependenciesAdd || [])
        ];
    }

    public async inputFiles(): Promise<string[]> {
        return [
            ...((await this[TaskOptionSymbol].inputFiles?.()) || []),
            ...(this[PrivateTaskOptionsSymbol].inputFilesAdd || [])
        ];
    }

    public async outputFiles(): Promise<string[]> {
        return [
            ...((await this[TaskOptionSymbol].outputFiles?.()) || []),
            ...(this[PrivateTaskOptionsSymbol].outputFilesAdd || [])
        ];
    }

    public addDependencies(...dependencies: string[]): void {
        this[PrivateTaskOptionsSymbol].dependenciesAdd = [
            ...(this[PrivateTaskOptionsSymbol].dependenciesAdd || []),
            ...dependencies
        ];
    }

    public addOutput(...outputFiles: string[]): void {
        this[PrivateTaskOptionsSymbol].outputFilesAdd = [
            ...(this[PrivateTaskOptionsSymbol].outputFilesAdd || []),
            ...outputFiles
        ];
    }
}

export type TaskFunction = (context: TaskContext) => Awaitable<unknown>;

export type TaskOptions = {
    name: string;
    description?: string;
    group?: string;
    dependencies?: string[];
    handler?: TaskFunction;
    inputFiles?: () => Promise<string[]>;
    outputFiles?: () => Promise<string[]>;
};

export type PrivateTaskOptions = {
    getDependencies?: () => Awaitable<string[]>;
    outputFilesAdd?: string[];
    inputFilesAdd?: string[];
    dependenciesAdd?: string[];
};

export default TaskControl;
