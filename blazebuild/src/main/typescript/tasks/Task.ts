import type { Awaitable } from "../types/Awaitable";

export const TaskOptionSymbol = "__taskoptions";

class Task {
    public [TaskOptionSymbol]: TaskOptions;

    public constructor(options: TaskOptions) {
        this[TaskOptionSymbol] = options;
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

    public async run(): Promise<void> {
        await this.handler();
    }

    public toString(): string {
        return `Task(${this.name})`;
    }

    public get dependencies(): string[] {
        return this[TaskOptionSymbol].dependencies || [];
    }

    public get inputFiles(): () => Promise<string[]> {
        return this[TaskOptionSymbol].inputFiles || (() => Promise.resolve([]));
    }

    public get outputFiles(): () => Promise<string[]> {
        return (
            this[TaskOptionSymbol].outputFiles || (() => Promise.resolve([]))
        );
    }
}

export type TaskFunction = () => Awaitable<unknown>;

export type TaskOptions = {
    name: string;
    description?: string;
    dependencies?: string[];
    handler?: TaskFunction;
    inputFiles?: () => Promise<string[]>;
    outputFiles?: () => Promise<string[]>;
};

export default Task;
