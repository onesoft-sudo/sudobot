import FluentSet from "@framework/collections/FluentSet";
import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { LogEventType } from "@main/schemas/LoggingSchema";
import { GuildMember, Message, Snowflake, TextChannel } from "discord.js";
import { MessageAutoModServiceContract } from "../contracts/MessageAutoModServiceContract";
import {
    MessageRuleScope,
    type default as ModerationRuleHandlerContract
} from "../contracts/ModerationRuleHandlerContract";
import { MessageRuleType } from "../schemas/MessageRuleSchema";
import ModerationRuleHandler from "../security/ModerationRuleHandler";
import type AuditLoggingService from "../services/AuditLoggingService";
import type ConfigurationManager from "../services/ConfigurationManager";
import type ModerationActionService from "../services/ModerationActionService";
import type PermissionManagerService from "../services/PermissionManagerService";
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

    public getFirstWordFilterRuleOrCreate(guildId: Snowflake) {
        if (!this.configurationManager.config[guildId]?.rule_moderation?.enabled) {
            return null;
        }

        let index = this.configurationManager.config[guildId]?.rule_moderation?.rules.findIndex(
            rule => rule.type === "word_filter"
        );

        if (index === -1) {
            this.configurationManager.config[guildId]?.rule_moderation?.rules.push({
                type: "word_filter",
                tokens: [],
                words: [],
                enabled: true,
                mode: "invert",
                normalize: true,
                actions: [
                    {
                        type: "delete_message"
                    }
                ],
                bail: false,
                is_bypasser: false,
                bypasses: null,
                name: "Managed Word Filter Rule"
            });

            index =
                (this.configurationManager.config[guildId]?.rule_moderation?.rules.length ?? 1) - 1;
        }

        return this.configurationManager.config[guildId]?.rule_moderation?.rules[
            index ?? 0
        ] as Extract<MessageRuleType, { type: "word_filter" }>;
    }

    public async onMessageCreate(message: Message<boolean>) {
        if (message.author.bot) {
            return;
        }

        await this.moderateMemberOrMessage({
            message,
            member: message.member!,
            guildId: message.guildId!
        });
    }

    @GatewayEventListener("guildMemberUpdate")
    public async onGuildMemberUpdate(oldMember: GuildMember, newMember: GuildMember) {
        if (
            oldMember.nickname === newMember.nickname &&
            oldMember.user.displayName === newMember.user.displayName &&
            oldMember.user.username === newMember.user.username &&
            oldMember.presence === newMember.presence
        ) {
            return;
        }

        presence: if (oldMember.presence && newMember.presence) {
            for (let index = 0; index < oldMember.presence.activities.length; index++) {
                const oldActivity = oldMember.presence.activities[index];
                const newActivity = newMember.presence.activities[index];

                if (
                    oldActivity?.name !== newActivity?.name ||
                    oldActivity?.state !== newActivity?.state ||
                    oldActivity?.details !== newActivity?.details
                ) {
                    break presence;
                }
            }
        }

        this.application.logger.debug(
            `Checking member profile ${newMember.user.id} in guild ${newMember.guild.id}`
        );
        await this.moderateMemberOrMessage({
            member: newMember,
            guildId: newMember.guild.id,
            contextType: "profile"
        });
    }

    public moderate(message: Message, options?: Partial<ModerateOptions>): Promise<boolean> {
        return this.moderateMemberOrMessage({
            message,
            member: message.member!,
            guildId: message.guildId!,
            ...options
        });
    }

    public async moderateMemberOrMessage(options: ModerateOptions): Promise<boolean> {
        const { guildId, message, contextType = "message" } = options;
        let { member } = options;
        const config = this.configFor(guildId!);

        if (!config?.enabled) {
            return false;
        }

        if (message && config.global_disabled_channels.includes(message.channelId)) {
            return false;
        }

        if (!(await this.shouldModerate(message ?? member))) {
            this.application.logger.debug(
                "Rule moderation is disabled for this user",
                message ? message.author.id : member.user.id
            );

            return false;
        }

        if (message) {
            let fetchedMember: GuildMember | null = member;

            if (!member) {
                fetchedMember = await safeMemberFetch(message.guild!, message.author.id);
            }

            if (!fetchedMember) {
                throw new Error("Member not found");
            }

            member = fetchedMember;
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
        const bypassedRules = new FluentSet<string>();

        for (const rule of rules) {
            if (rule.name && bypassedRules.has(rule.name)) {
                this.logger.debug(`Rule ${rule.name} (${rule.type}) has been bypassed`);
                continue;
            }

            if (
                scopes !== undefined &&
                options.scopes !== undefined &&
                scopes?.[rule.type]?.find((scope: MessageRuleScope) =>
                    options.scopes?.includes(scope)
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

            if (contextTypes?.[rule.type] && !contextTypes?.[rule.type].includes(contextType)) {
                this.application.logger.debug(
                    `Rule type ${rule.type} does not expect a message or profile context`
                );

                continue;
            }

            const result = await handler.call(this.ruleHandler, {
                type: contextType,
                message,
                rule,
                member
            });

            count++;

            if (rule.is_bypasser && rule.bypasses?.length && result.matched) {
                bypassedRules.add(...rule.bypasses);
                this.application.logger.debug(
                    `Rule ${rule.name} (${rule.type}) has been queued to be bypassed`
                );
                continue;
            }

            if (result.matched) {
                moderated = true;

                this.application.logger.debug(
                    message
                        ? `Rule ${count} matched for message ${message.id} in guild ${guildId}`
                        : `Rule ${count} matched for member ${member.user.id} in guild ${guildId}`
                );

                if (!options?.skipActions) {
                    const { failedActions } = await this.moderationActionService.takeActions(
                        message?.guild ?? member.guild,
                        member,
                        message
                            ? rule.actions
                            : rule.actions.filter(
                                  action =>
                                      action.type !== "verbal_warn" &&
                                      action.type !== "clear" &&
                                      action.type !== "delete_message"
                              ),
                        message
                            ? {
                                  message,
                                  channel: message.channel! as TextChannel
                              }
                            : undefined
                    );

                    if (failedActions.length > 0) {
                        this.application.logger.warn(
                            `Failed to execute actions for rule ${rule.type} in guild ${guildId}`
                        );
                        this.application.logger.warn(failedActions.join("\n"));
                    }

                    await this.auditLoggingService.emitLogEvent(
                        guildId!,
                        LogEventType.SystemAutoModRuleModeration,
                        message ? "message" : "profile",
                        message ?? member,
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
                message
                    ? `Message ${message.id} in guild ${message.guildId} has been moderated`
                    : `Member ${member.user.id} in guild ${member.guild.id} has been moderated`
            );
            this.application.logger.debug(`Executed ${count} rules`);
        }

        return moderated;
    }

    private configFor(guildId: Snowflake) {
        return this.configurationManager.config[guildId!]?.rule_moderation;
    }

    private async shouldModerate(messageOrMember: Message | GuildMember) {
        if (
            (messageOrMember instanceof Message && messageOrMember.author.bot) ||
            (messageOrMember instanceof GuildMember && messageOrMember.user.bot) ||
            !this.configFor(messageOrMember.guild!.id!)?.enabled
        ) {
            return false;
        }

        let finalMember: GuildMember;

        if (messageOrMember instanceof Message) {
            let { member } = messageOrMember;

            if (!member) {
                member = await safeMemberFetch(messageOrMember.guild!, messageOrMember.author.id);
            }

            if (!member) {
                throw new Error("Member not found");
            }

            finalMember = member;
        } else {
            finalMember = messageOrMember;
        }

        return this.permissionManagerService.canAutoModerate(finalMember);
    }

    private async createRuleHandler(): Promise<ModerationRuleHandlerContract> {
        const instance = new ModerationRuleHandler(this.application);
        this.application.container.resolveProperties(ModerationRuleHandler, instance);
        await instance.boot?.();
        return instance;
    }

    private async checkPreconditions(
        member: GuildMember,
        rule: MessageRuleType,
        message?: Message
    ) {
        if (rule.for) {
            const { roles, users, channels } = rule.for;

            if (roles !== undefined) {
                if (!member.roles.cache.some(r => roles.includes(r.id))) {
                    return false;
                }
            }

            if (users !== undefined) {
                if (
                    (message && !users.includes(message.author.id)) ||
                    !users.includes(member.user.id)
                ) {
                    return false;
                }
            }

            if (channels !== undefined && message) {
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
                if (
                    (message && users.includes(message.author.id)) ||
                    users.includes(member.user.id)
                ) {
                    return false;
                }
            }

            if (channels !== undefined && message) {
                if (channels.includes(message.channelId)) {
                    return false;
                }
            }
        }

        return true;
    }

    private async handleBypasser() {}
}

type ModerateOptions = {
    skipActions?: boolean;
    scopes?: MessageRuleScope[];
    message?: Message;
    member: GuildMember;
    guildId: Snowflake;
    contextType?: "profile" | "message";
};

export default RuleModerationService;
