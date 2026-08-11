import { Inject } from "@framework/container/Inject.js";
import Service from "@framework/services/Service.js";
import Application from "@main/core/Application.js";
import Rule from "@main/moderation/Rule.js";
import RuleManager, {
    RuleConstructor,
    RuleExecResult
} from "@main/moderation/RuleManager.js";
import { ServiceID } from "@main/core/ServiceID.js";
import { RuleType } from "@schemas/all.js";
import { Message } from "discord.js";
import type ConfigurationManagerService from "./ConfigurationManagerService.js";
import { ConfigurationType } from "./ConfigurationManagerService.js";
import type ModerationActionService from "./ModerationActionService.js";

class RuleModerationService extends Service {
    public override readonly name: string = ServiceID.RULE_MODERATION;
    protected readonly ruleManager: RuleManager;

    @Inject(ServiceID.CONFIGURATION_MANAGER)
    protected readonly configurationManagerService!: ConfigurationManagerService;

    @Inject(ServiceID.MODERATION_ACTION)
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
