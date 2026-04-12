import { Inject } from "@framework/container/Inject";
import Service from "@framework/services/Service";
import Application from "@main/core/Application";
import Rule from "@main/moderation/Rule";
import RuleManager, {
    RuleConstructor,
    RuleExecResult
} from "@main/moderation/RuleManager";
import { RuleType } from "@schemas/all";
import { Message } from "discord.js";
import type ConfigurationManagerService from "./ConfigurationManagerService";
import {
    ConfigurationType,
    SERVICE_CONFIGURATION_MANAGER
} from "./ConfigurationManagerService";
import type ModerationActionService from "./ModerationActionService";
import { SERVICE_MODERATION_ACTION } from "./ModerationActionService";

export const SERVICE_RULE_MODERATION = "ruleModerationService";

class RuleModerationService extends Service {
    public override readonly name: string = SERVICE_RULE_MODERATION;
    protected readonly ruleManager: RuleManager;

    @Inject(SERVICE_CONFIGURATION_MANAGER)
    protected readonly configurationManagerService!: ConfigurationManagerService;

    @Inject(SERVICE_MODERATION_ACTION)
    protected readonly moderationActionService!: ModerationActionService;

    public constructor(application: Application) {
        super(application);
        this.ruleManager = new RuleManager(application);
    }

    public register(
        rule: Rule<RuleType, unknown> | RuleConstructor<RuleType, unknown>
    ) {
        this.ruleManager.register(rule);
    }

    public async moderateMessage(
        message: Message<true>
    ): Promise<RuleExecResult> {
        const config = await this.configurationManagerService.get(
            ConfigurationType.Guild,
            message.guildId
        );

        if (!config.rule_moderation?.enabled) {
            return {
                passed: true
            };
        }

        return this.ruleManager.moderate({
            rules: config.rule_moderation.message_rules,
            message
        });
    }
}

export default RuleModerationService;
