import { Inject } from "@framework/container/Inject";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { LogEventType } from "@main/types/LoggingSchema";
import { GuildMember, Message, Snowflake, TextChannel } from "discord.js";
import { MessageAutoModServiceContract } from "../contracts/MessageAutoModServiceContract";
import {
    MessageRuleScope,
    type default as ModerationRuleHandlerContract
} from "../contracts/ModerationRuleHandlerContract";
import ModerationRuleHandler from "../security/ModerationRuleHandler";
import type AuditLoggingService from "../services/AuditLoggingService";
import type ConfigurationManager from "../services/ConfigurationManager";
import type ModerationActionService from "../services/ModerationActionService";
import type PermissionManagerService from "../services/PermissionManagerService";
import { MessageRuleType } from "../types/MessageRuleSchema";
import { safeMemberFetch } from "../utils/fetch";

@Name("ruleModerationService")
class RuleModerationService
    extends Service
    implements MessageAutoModServiceContract, HasEventListeners
{
    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    @Inject("moderationActionService")
    private readonly moderationActionService!: ModerationActionService;

    @Inject("auditLoggingService")
    private readonly auditLoggingService!: AuditLoggingService;

    @Inject("permissionManager")
    private readonly permissionManagerService!: PermissionManagerService;

    private _ruleHandler?: ModerationRuleHandlerContract;

    private get ruleHandler() {
        return this._ruleHandler!;
    }

    public override async boot(): Promise<void> {
        this._ruleHandler = await this.createRuleHandler();
    }

    private configFor(guildId: Snowflake) {
        return this.configurationManager.config[guildId!]?.rule_moderation;
    }

    private async shouldModerate(message: Message) {
        if (message.author.bot || !this.configFor(message.guildId!)?.enabled) {
            return false;
        }

        let { member } = message;

        if (!member) {
            member = await safeMemberFetch(message.guild!, message.author.id);
        }

        if (!member) {
            throw new Error("Member not found");
        }

        return this.permissionManagerService.canAutoModerate(member);
    }

    private async createRuleHandler(): Promise<ModerationRuleHandlerContract> {
        const instance = new ModerationRuleHandler(this.application);
        await instance.boot?.();
        return instance;
    }

    public async onMessageCreate(message: Message<boolean>) {
        if (message.author.bot) {
            return;
        }

        await this.moderate(message);
    }

    public async moderate(message: Message, options?: ModerateOptions): Promise<boolean> {
        const config = this.configFor(message.guildId!);

        if (!config?.enabled) {
            return false;
        }

        if (config.global_disabled_channels.includes(message.channelId)) {
            return false;
        }

        if (!(await this.shouldModerate(message))) {
            this.application.logger.debug(
                "Rule moderation is disabled for this user",
                message.author.id
            );

            return false;
        }

        let { member } = message;

        if (!member) {
            member = await safeMemberFetch(message.guild!, message.author.id);
        }

        if (!member) {
            throw new Error("Member not found");
        }

        const rules = config.rules;
        let count = 0;
        let moderated = false;

        const contextTypes = Reflect.getMetadata(
            "rule:context:types",
            this.ruleHandler.constructor.prototype
        );
        const scopes = Reflect.getMetadata(
            "rule:context:scopes",
            this.ruleHandler.constructor.prototype
        );

        for (const rule of rules) {
            if (
                options?.scopes !== undefined &&
                scopes?.[rule.type].find((scope: MessageRuleScope) =>
                    options?.scopes?.includes(scope)
                ) === undefined
            ) {
                continue;
            }

            if (!rule.enabled || !(await this.checkPreconditions(member, rule, message))) {
                continue;
            }

            if (rule.actions.length === 0) {
                this.application.logger.warn(
                    `Rule ${count} has no actions defined. Considering it as disabled.`
                );
                continue;
            }

            const handler = this.ruleHandler[rule.type];

            if (!handler) {
                this.application.logger.warn(`No handler found for rule type ${rule.type}`);
                this.application.logger.warn("This is likely a bug, please report it");
                continue;
            }

            const expectsContext = contextTypes?.[rule.type]?.includes("message");

            if (!expectsContext && contextTypes?.[rule.type]) {
                this.application.logger.debug(
                    `Rule type ${rule.type} does not expect a message context`
                );

                continue;
            }

            const result = await handler.call(this.ruleHandler, {
                type: "message",
                message,
                rule
            });

            count++;

            if (result.matched) {
                moderated = true;

                this.application.logger.debug(
                    `Rule ${count} matched for message ${message.id} in guild ${message.guildId}`
                );

                if (!options?.skipActions) {
                    const { failedActions } = await this.moderationActionService.takeActions(
                        message.guild!,
                        member,
                        rule.actions,
                        {
                            message,
                            channel: message.channel! as TextChannel
                        }
                    );

                    if (failedActions.length > 0) {
                        this.application.logger.warn(
                            `Failed to execute actions for rule ${rule.type} in guild ${message.guildId}`
                        );
                        this.application.logger.warn(failedActions.join("\n"));
                    }

                    await this.auditLoggingService.emitLogEvent(
                        message.guildId!,
                        LogEventType.SystemAutoModRuleModeration,
                        message,
                        rule,
                        result
                    );
                }

                if (rule.bail) {
                    break;
                }
            }
        }

        if (moderated) {
            this.application.logger.debug(
                `Message ${message.id} in guild ${message.guildId} has been moderated`
            );
            this.application.logger.debug(`Executed ${count} rules`);
        }

        return moderated;
    }

    private async checkPreconditions(member: GuildMember, rule: MessageRuleType, message: Message) {
        if (rule.for) {
            const { roles, users, channels } = rule.for;

            if (roles !== undefined) {
                if (!member.roles.cache.some(r => roles.includes(r.id))) {
                    return false;
                }
            }

            if (users !== undefined) {
                if (!users.includes(message.author.id)) {
                    return false;
                }
            }

            if (channels !== undefined) {
                if (!channels.includes(message.channelId)) {
                    return false;
                }
            }
        }

        if (rule.exceptions) {
            const { roles, users, channels } = rule.exceptions;

            if (roles !== undefined) {
                if (member.roles.cache.some(r => roles.includes(r.id))) {
                    return false;
                }
            }

            if (users !== undefined) {
                if (users.includes(message.author.id)) {
                    return false;
                }
            }

            if (channels !== undefined) {
                if (channels.includes(message.channelId)) {
                    return false;
                }
            }
        }

        return true;
    }
}

type ModerateOptions = {
    skipActions?: boolean;
    scopes?: MessageRuleScope[];
};

export default RuleModerationService;
