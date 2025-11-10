import type LegacyContext from "@framework/commands/LegacyContext";
import type { ArgumentDefinition, ArgumentRules } from "./ArgumentSchema";
import type InteractionContext from "@framework/commands/InteractionContext";
import type Application from "@framework/app/Application";
import { requireNonNull } from "@framework/utils/utils";
import type { Awaitable, ChatInputCommandInteraction } from "discord.js";
import { ArgumentErrorType, InvalidArgumentError } from "./InvalidArgumentError";
import type Context from "@framework/commands/Context";

export type ArgumentCreateOptions =
    | {
          context: LegacyContext;
          definition: ArgumentDefinition;
          argument: string;
          index: number;
          application: Application;
          typeIndex: number;
      }
    | {
          context: InteractionContext;
          definition: ArgumentDefinition;
          name: string;
          index: number;
          application: Application;
          typeIndex: number;
      };

abstract class Argument<T> {
    protected readonly application: Application;
    protected value?: T;
    protected rawValue: string;
    protected readonly name: string;
    protected readonly definition: ArgumentDefinition;
    protected readonly rules?: ArgumentRules;
    protected readonly interactionName: string;
    protected readonly context: Context;
    protected readonly position: number;

    public readonly abortAfterParsing: boolean = false;

    public constructor(
        application: Application,
        context: Context,
        definition: ArgumentDefinition,
        typeIndex: number,
        position: number,
        rawValue: string
    ) {
        this.application = application;
        this.context = context;
        this.definition = definition;
        this.name = definition.name;
        this.interactionName = definition.interactionName ?? definition.name;
        this.rules = Array.isArray(definition.rules)
            ? (definition.rules?.[typeIndex] ?? definition.rules[0])
            : definition.rules;
        this.position = position;
        this.rawValue = rawValue || "";
    }

    public getValue() {
        return requireNonNull(this.value);
    }

    public toString() {
        return this.rawValue.toString();
    }

    protected preValidate(): Awaitable<boolean> {
        if (!this.definition.isOptional && !this.rawValue) {
            throw new InvalidArgumentError(`Argument '${this.name}' is required`, {
                type: ArgumentErrorType.Required
            });
        }

        return true;
    }

    protected postValidate(): Awaitable<boolean> {
        return true;
    }

    protected error(message: string, type: ArgumentErrorType): never {
        throw new InvalidArgumentError(this.getRuleErrorMessage(type) || message, { type });
    }

    protected getRuleValue<T>(name: keyof ArgumentRules) {
        if (this.rules && typeof this.rules[name] === "object" && this.rules[name]) {
            return (this.rules[name] as { value: unknown }).value as T;
        }

        return this.rules?.[name] as T | undefined;
    }

    protected getRuleErrorMessage(name: keyof ArgumentRules) {
        if (this.rules && typeof this.rules[name] === "object" && this.rules[name]) {
            return (
                (this.rules[name] as { errorMessage?: string }).errorMessage || this.definition.errorMessages?.[name]
            );
        }

        return this.definition.errorMessages?.[name];
    }

    protected abstract resolveFromRawValue(): Awaitable<T>;
    protected abstract resolveFromInteraction(interaction: ChatInputCommandInteraction): Awaitable<T>;

    protected static async create<A, T extends typeof Argument<A>>(
        this: T,
        options: ArgumentCreateOptions,
        rawValue: unknown
    ): Promise<InstanceType<T>> {
        const instance = new (this as unknown as new (
            application: Application,
            context: Context,
            definition: ArgumentDefinition,
            typeIndex: number,
            position: number,
            rawValue: unknown
        ) => InstanceType<T>)(
            options.application,
            options.context,
            options.definition,
            options.typeIndex,
            options.index,
            rawValue
        );

        if (!(await instance.preValidate())) {
            throw new InvalidArgumentError(`Argument '${options.definition.name}': Invalid argument`, {
                type: ArgumentErrorType.Unknown
            });
        }

        return instance;
    }

    public static async createFromLegacy<A, T extends typeof Argument<A>>(
        this: T,
        options: Extract<ArgumentCreateOptions, { context: LegacyContext }>
    ): Promise<InstanceType<T>> {
        const instance = await this.create<A, T>(options, options.argument);

        instance.value = await instance.resolveFromRawValue();

        if (!(await instance.postValidate())) {
            throw new InvalidArgumentError(`Argument '${options.definition.name}': Invalid argument`, {
                type: ArgumentErrorType.Unknown
            });
        }

        return instance;
    }

    public static async createFromInteraction<A, T extends typeof Argument<A>>(
        this: T,
        options: Extract<ArgumentCreateOptions, { context: InteractionContext }>
    ): Promise<InstanceType<T>> {
        const instance = await this.create<A, T>(
            options,
            options.context.commandMessage.options
                .get(options.definition.interactionName ?? options.definition.name)
                ?.value?.toString()
        );

        instance.value = await instance.resolveFromInteraction(
            options.context.commandMessage as unknown as ChatInputCommandInteraction
        );

        if (!(await instance.postValidate())) {
            throw new InvalidArgumentError(`Argument '${options.definition.name}': Invalid argument`, {
                type: ArgumentErrorType.Unknown
            });
        }

        return instance;
    }
}

export default Argument;
