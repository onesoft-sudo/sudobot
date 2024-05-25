import { lstat } from "fs/promises";
import { DEFAULT_MODULE } from "../cache/CacheManager";
import type Blaze from "../core/Blaze";
import IO from "../io/IO";
import type { Awaitable } from "../types/utils";
import { TASK_ACTION_METADATA_KEY } from "./TaskAction";
import { TASK_INPUT_GENERATOR_METADATA_KEY } from "./TaskInputGenerator";
import { TASK_OUTPUT_GENERATOR_METADATA_KEY } from "./TaskOutputGenerator";

abstract class AbstractTask<R = void> {
    protected readonly name?: string;
    private _input = new Set<string>();
    private _output = new Set<string>();

    public constructor(protected readonly blaze: Blaze) {}

    protected generateInput?(): Awaitable<Iterable<string>>;
    protected run?(): Awaitable<R>;
    protected generateOutput?(result: R): Awaitable<Iterable<string>>;

    public async getIO() {
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

        if (!methodName) {
            throw new Error("No action defined in task!");
        }

        return {
            methodName,
            call: (this[methodName as keyof this] as () => Awaitable<R>).bind(this)
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

    public async isUpToDate() {
        if (
            this.blaze.cacheManager.cache[DEFAULT_MODULE]?.buildFileModTime !==
            this.blaze.buildScriptManager.buildScriptLastModTime
        ) {
            return false;
        }

        const previousOutput = this.blaze.cacheManager.getCachedFiles(
            DEFAULT_MODULE,
            this.determineName()
        );

        if (!previousOutput) {
            return false;
        }

        for (const file in previousOutput) {
            const previousMtimeMs = previousOutput[file];

            if (previousMtimeMs === undefined) {
                return false;
            }

            let mtimeMs = null;

            try {
                mtimeMs = (await lstat(file)).mtimeMs;
            } catch (error) {
                IO.debug("Failed to stat file: " + (error as Error).message);
            }

            if (mtimeMs !== previousMtimeMs) {
                return false;
            }
        }

        return true;
    }

    public async execute() {
        const { call: callExecute } = this.findAction();
        const { call: callGenerateInput } = this.findInputGenerator();
        this._input = callGenerateInput ? new Set(await callGenerateInput()) : this._input;

        if (await this.isUpToDate()) {
            return;
        }

        const result = await callExecute();
        const { call: callGenerateOutput } = this.findOutputGenerator();

        this._output = callGenerateOutput
            ? new Set(await callGenerateOutput(result))
            : this._output;

        for (const file of this._output) {
            let mtimeMs = null;

            try {
                mtimeMs = (await lstat(file)).mtimeMs;
            } catch (error) {
                IO.debug("Failed to stat file: " + (error as Error).message);
            }

            this.blaze.cacheManager.setCachedLastModTime(
                DEFAULT_MODULE,
                this.determineName(),
                file,
                mtimeMs
            );
        }
    }

    public determineName() {
        if (this.name) {
            return this.name;
        }

        const className = this.constructor.name;
        return className[0].toLowerCase() + className.slice(1).replace(/Task$/, "");
    }
}

export default AbstractTask;
