import type Blaze from "../core/Blaze";
import type { Awaitable } from "../types/utils";
import { ACTIONLESS_TASK_METADATA_KEY } from "./ActionlessTask";
import { TASK_ACTION_METADATA_KEY } from "./TaskAction";
import { TASK_INPUT_GENERATOR_METADATA_KEY } from "./TaskInputGenerator";
import { TASK_OUTPUT_GENERATOR_METADATA_KEY } from "./TaskOutputGenerator";

abstract class AbstractTask<R = void> {
    protected readonly name?: string;
    private _input = new Set<string>();
    private _output = new Set<string>();
    private _hasComputedInput = false;
    private _hasComputedOutput = false;

    public constructor(protected readonly blaze: Blaze) {}

    protected generateInput?(): Awaitable<Iterable<string>>;
    protected run?(): Awaitable<R>;
    protected generateOutput?(result: R): Awaitable<Iterable<string>>;
    protected dependencies?(): Awaitable<Iterable<TaskResolvable<any>>>;

    public get io() {
        return {
            input: this._input as ReadonlySet<string>,
            output: this._output as ReadonlySet<string>
        };
    }

    protected addOutput(...files: string[]) {
        for (const file of files) {
            this._output.add(file);
        }
    }

    protected clearOutput() {
        this._output.clear();
    }

    private findAction() {
        const methodName = Reflect.getMetadata(TASK_ACTION_METADATA_KEY, this);
        const isActionLess = Reflect.getMetadata(ACTIONLESS_TASK_METADATA_KEY, this.constructor);

        if (!methodName && !isActionLess) {
            throw new Error("No action defined in task!");
        } else if (methodName && isActionLess) {
            throw new Error("Cannot define both action and actionless task in the same class!");
        }

        return {
            methodName,
            call: isActionLess
                ? ((() => void 0) as () => Awaitable<R>)
                : (this[methodName as keyof this] as () => Awaitable<R>).bind(this)
        };
    }

    private findInputGenerator() {
        const methodName = Reflect.getMetadata(TASK_INPUT_GENERATOR_METADATA_KEY, this);

        if (!methodName) {
            return {
                methodName: null,
                call: null
            };
        }

        return {
            methodName,
            call: (this[methodName as keyof this] as () => Awaitable<Iterable<string>>).bind(this)
        };
    }

    private findOutputGenerator() {
        const methodName = Reflect.getMetadata(TASK_OUTPUT_GENERATOR_METADATA_KEY, this);

        if (!methodName) {
            return {
                methodName: null,
                call: null
            };
        }

        return {
            methodName,
            call: (
                this[methodName as keyof this] as (result: R) => Awaitable<Iterable<string>>
            ).bind(this)
        };
    }

    public get hasComputedInput() {
        return this._hasComputedInput;
    }

    public get hasComputedOutput() {
        return this._hasComputedOutput;
    }

    public async computeInput() {
        const { call: callGenerateInput } = this.findInputGenerator();
        this._input = callGenerateInput ? new Set(await callGenerateInput()) : this._input;
        this._hasComputedInput = true;
    }

    public async computeOutput(result: R) {
        const { call: callGenerateOutput } = this.findOutputGenerator();
        this._output = callGenerateOutput
            ? new Set(await callGenerateOutput(result))
            : this._output;
        this._hasComputedOutput = true;
    }

    public async execute() {
        const { call: callExecute } = this.findAction();
        const result = await callExecute();
        await this.computeOutput(result);
    }

    public determineName() {
        if (this.name) {
            return this.name;
        }

        const className = this.constructor.name;
        return className[0].toLowerCase() + className.slice(1).replace(/Task$/, "");
    }
}

export type TaskResolvable<T> = string | typeof AbstractTask<T>;

export default AbstractTask;
