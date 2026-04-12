import type Application from "@main/core/Application";
import type { RuleDefinitionByType, RuleType } from "@schemas/all";
import type { APIEmbed, Awaitable, EmbedField } from "discord.js";

abstract class Rule<T extends RuleType, O> {
    protected readonly application: Application;
    public abstract readonly name: T;

    public constructor(application: Application) {
        this.application = application;
    }

    public abstract check(operand: O, context: RuleContext<T>): Awaitable<boolean>;

    public onAppBoot?(): Awaitable<void>;
}

export type RuleContext<T extends RuleType> = {
    definition: RuleDefinitionByType<T>;
    logEmbed: Partial<APIEmbed>;
    fields: EmbedField[];
};

export default Rule;
