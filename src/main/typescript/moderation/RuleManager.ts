import type Application from "@main/core/Application";
import { assert } from "@main/utils/utils";
import type {
    APIEmbed,
    EmbedField,
    GuildMember,
    GuildTextBasedChannel,
    Message
} from "discord.js";
import {
    Collection
} from "discord.js";
import MessageRule from "./MessageRule";
import ProfileRule from "./ProfileRule";
import type Rule from "./Rule";
import ProfileMessageRule from "./ProfileMessageRule";
import type { ModerationActionType, RuleDefinition, RuleType } from "@schemas/all";
import { xor } from "@framework/utils/logic";
import { SERVICE_MODERATION_ACTION } from "@main/services/ModerationActionService";
import type ModerationActionService from "@main/services/ModerationActionService";
import { requireNonNull } from "@framework/utils/utils";

class RuleManager {
    protected readonly application: Application;
    protected readonly rules = new Collection<
        string,
        Rule<RuleType, unknown>
    >();

    public constructor(application: Application) {
        this.application = application;
    }

    public register(
        rule: Rule<RuleType, unknown> | RuleConstructor<RuleType, unknown>
    ) {
        rule = typeof rule === "function" ? new rule(this.application) : rule;
        this.rules.set(rule.name, rule);
    }

    protected testContextFor(
        context: RuleTestContext,
        tests: NonNullable<RuleDefinition["for"]>
    ) {
        if (context.message && tests.channels?.length) {
            if (!tests.channels.includes(context.message.channelId)) {
                return false;
            }
        }

        const member = context.member ?? context.message?.member;

        if (member && tests.users?.length) {
            if (!tests.users.includes(member.id)) {
                return false;
            }
        }

        if (member && tests.roles?.length) {
            if (!member.roles.cache.hasAny(...tests.roles)) {
                return false;
            }
        }

        return true;
    }

    protected testContextException(
        context: RuleTestContext,
        tests: NonNullable<RuleDefinition["exceptions"]>
    ) {
        if (context.message && tests.channels?.length) {
            if (tests.channels.includes(context.message.channelId)) {
                return true;
            }
        }

        const member = context.member ?? context.message?.member;

        if (member && tests.users?.length) {
            if (tests.users.includes(member.id)) {
                return true;
            }
        }

        if (member && tests.roles?.length) {
            if (member.roles.cache.hasAny(...tests.roles)) {
                return true;
            }
        }

        return false;
    }

    public async moderate(context: RuleTestContext): Promise<RuleExecResult> {
        const guild = context.message?.guild || context.member?.guild;

        if (!guild) {
            throw new Error("No valid guild found");
        }

        const result = await this.test(context);
        const actions = [];

        if (!result.passed) {
            for (const def of result.failedRuleDefs) {
                actions.push(...def.actions);
            }

            if (actions.length) {
                await this.application
                    .service<ModerationActionService>(SERVICE_MODERATION_ACTION)
                    .takeActions(
                        guild,
                        requireNonNull(
                            context.message?.member ??
                                context.message?.author ??
                                context.member
                        ),
                        actions,
                        {
                            channel:
                                !context.message?.channel?.isTextBased() ||
                                context.message?.channel?.isDMBased()
                                    ? undefined
                                    : context.message?.channel as GuildTextBasedChannel,
                            message: context.message
                        }
                    );

                this.application.logger.debug("Action(s) taken");
            }
        }

        const reason =
            actions.reduce(
                (acc, action) =>
                    `${acc}${"reason" in action && action.reason ? action.reason + "\n" : ""}`,
                ""
            ) || undefined;

        return {
            ...result,
            actions,
            reason
        };
    }

    public async test(context: RuleTestContext): Promise<RuleTestResult> {
        assert(
            xor(!!context.message, !!context.member),
            "No operand to test or multiple operands"
        );

        const bypassedRules = new Set<string>();
        let i = 0;
        let result = true;

        const failedRules = [];
        const data: Record<number, unknown> = {};
        const fields: EmbedField[] = [];
        const logEmbed: Partial<APIEmbed> = {};

        for (const def of context.rules) {
            const rule = this.rules.get(def.type);
            const index = i++;

            if (!rule) {
                throw new Error(`Invalid rule name: ${def.type}`);
            }

            if (!def.enabled) {
                continue;
            }

            if (def.name && bypassedRules.has(def.name)) {
                this.application.logger.debug(`Rule #${index} bypassed`);
                continue;
            }

            if (
                def.exceptions &&
                this.testContextException(context, def.exceptions)
            ) {
                this.application.logger.debug(
                    `Rule #${index} exception triggered`
                );
                continue;
            }

            if (def.for && !this.testContextFor(context, def.for)) {
                continue;
            }

            result = false;

            const ruleContext = {
                definition: def,
                logEmbed,
                fields,
                data
            };

            try {
                if (context.message && rule instanceof MessageRule) {
                    result = await rule.check(context.message, ruleContext);
                } else if (context.member && rule instanceof ProfileRule) {
                    result = await rule.check(context.member, ruleContext);
                } else if (rule instanceof ProfileMessageRule) {
                    result = await rule.check(
                        {
                            member: context.member as undefined,
                            message: context.message!
                        },
                        ruleContext
                    );
                } else {
                    continue;
                }
            } catch (error) {
                this.application.logger.error(error);
                result = false;
            }

            if (def.mode === "invert") {
                result = !result;
            }

            if (def.is_bypasser && def.bypasses?.length && result) {
                for (const name of def.bypasses) {
                    bypassedRules.add(name);
                }
            }

            if (!result) {
                failedRules.push(def);
            }

            if (def.bail && !result) {
                break;
            }
        }

        return {
            passed: result,
            failedRuleDefs: failedRules,
            data,
            fields,
            logEmbed
        };
    }
}

export type RuleConstructor<T extends RuleType, O> = new (
    application: Application
) => Rule<T, O>;
export type RuleTestContext = {
    message?: Message<boolean>;
    member?: GuildMember;
    rules: Iterable<RuleDefinition>;
};
export type RuleTestResult = {
    passed: boolean;
    failedRuleDefs: RuleDefinition[];
    data: Record<number, unknown>;
    fields: EmbedField[];
    logEmbed: Partial<APIEmbed>;
};
export type RuleExecResult = Partial<RuleTestResult> & {
    reason?: string;
    actions?: ModerationActionType[];
};

export default RuleManager;
