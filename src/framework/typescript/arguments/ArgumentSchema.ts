import type { OptionalRecord } from "@framework/types/OptionalRecord";
import type Argument from "./Argument";

export type ArgumentRuleData<T> =
    | T
    | {
          value: T;
          errorMessage?: string;
      };

export type ArgumentRules = {
    "range:min"?: ArgumentRuleData<number>;
    "range:max"?: ArgumentRuleData<number>;
} & OptionalRecord<string, ArgumentRuleData<unknown>>;

export type ArgumentDefinition<T extends typeof Argument<unknown> = typeof Argument<unknown>> = {
    type: T | T[];
    name: string;
    isOptional?: boolean;
    interactionName?: string;
    defaultIndex?: number;
    rules?: ArgumentRules | ArgumentRules[];
    errorMessages?: Record<keyof ArgumentRules, string>;
};

export type OptionDefinition = {
    short?: string;
    multiple?: boolean;
    argument?: boolean;
};

export type ArgumentOverload = {
    definitions: ArgumentDefinition[];
    options?: Record<string, OptionDefinition>;
};

export type ArgumentSchema = {
    overloads: ArgumentOverload[];
    defaultIndex?: number;
};
