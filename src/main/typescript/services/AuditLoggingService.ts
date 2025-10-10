/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { channelInfo, messageInfo, userInfo } from "@framework/utils/embeds";
import { fetchChannel } from "@framework/utils/entities";
import { isDiscordAPIError } from "@framework/utils/errors";
import { Colors } from "@main/constants/Colors";
import { RuleExecResult } from "@main/contracts/ModerationRuleHandlerContract";
import {
    LogEventArgs,
    LogEventType,
    LogGuildVerificationAttemptPayload,
    LogGuildVerificationNotEnoughInfoPayload,
    LogGuildVerificationSuccessPayload,
    LogMemberBanAddPayload,
    LogMemberBanRemovePayload,
    LogMemberKickPayload,
    LogMemberMassBanPayload,
    LogMemberMassKickPayload,
    LogMemberMassUnbanPayload,
    LogMemberModMessageAddPayload,
    LogMemberMuteAddPayload,
    LogMemberMuteRemovePayload,
    LogMemberNicknameModificationPayload,
    LogMemberRoleModificationPayload,
    LogMemberTimeoutAddPayload,
    LogMemberTimeoutRemovePayload,
    LogMemberWarningAddPayload,
    LogMessageBulkDeletePayload,
    LogMessageReactionClearPayload,
    LogNewMemberMessageInspectionPayload,
    LogRaidAlertPayload,
    LogUserNoteAddPayload,
    LoggingExclusionType
} from "@main/schemas/LoggingSchema";
import { MessageRuleType } from "@main/schemas/MessageRuleSchema";
import ConfigurationManager from "@main/services/ConfigurationManager";
import { chunkedString } from "@main/utils/utils";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    APIEmbedField,
    ActionRowBuilder,
    AttachmentBuilder,
    Awaitable,
    ButtonBuilder,
    ButtonStyle,
    Collection,
    GuildBasedChannel,
    GuildMember,
    Message,
    MessageCreateOptions,
    MessagePayload,
    MessageReferenceType,
    PartialMessage,
    Snowflake,
    TextChannel,
    User,
    Webhook,
    bold,
    inlineCode,
    italic,
    roleMention,
    time,
    userMention
} from "discord.js";

type WebhookInfo =
    | {
          status: "success";
          webhook: Webhook;
          useFailedAttempts?: number;
      }
    | {
          status: "error";
          attempts: number;
      };

/* eslint-disable @typescript-eslint/unbound-method */

@Name("auditLoggingService")
class AuditLoggingService extends Service {
    private readonly webhooks = new Collection<`${Snowflake}::${Snowflake}`, WebhookInfo>();
    private readonly channels = new Collection<`${Snowflake}::${string}`, Snowflake | null>();
    private readonly logHandlers: Record<
        LogEventType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (...args: any[]) => Promise<Message | undefined>
    > = {
        [LogEventType.MessageDelete]: this.logMessageDelete,
        [LogEventType.MessageUpdate]: this.logMessageUpdate,
        [LogEventType.MessageDeleteBulk]: this.logMessageDeleteBulk,
        [LogEventType.MessageReactionClear]: this.logMessageReactionClear,
        [LogEventType.MemberBanAdd]: this.logMemberBanAdd,
        [LogEventType.MemberMassBan]: this.logMemberMassBan,
        [LogEventType.MemberMassUnban]: this.logMemberMassUnban,
        [LogEventType.MemberMassKick]: this.logMemberMassKick,
        [LogEventType.MemberBanRemove]: this.logMemberBanRemove,
        [LogEventType.GuildMemberAdd]: this.logGuildMemberAdd,
        [LogEventType.GuildMemberRemove]: this.logGuildMemberRemove,
        [LogEventType.GuildMemberKick]: this.logGuildMemberKick,
        [LogEventType.MemberMuteAdd]: this.logMemberMute,
        [LogEventType.MemberMuteRemove]: this.logMemberUnmute,
        [LogEventType.MemberTimeoutAdd]: this.logMemberTimeoutAdd,
        [LogEventType.MemberTimeoutRemove]: this.logMemberTimeoutRemove,
        [LogEventType.MemberWarningAdd]: this.logMemberWarn,
        [LogEventType.MemberModeratorMessageAdd]: this.logMemberModMessageAdd,
        [LogEventType.UserNoteAdd]: this.logUserNoteAdd,
        [LogEventType.MemberRoleModification]: this.logMemberRoleModification,
        [LogEventType.SystemAutoModRuleModeration]: this.logMessageRuleModeration,
        [LogEventType.SystemUserMessageSave]: this.logSystemUserMessageSave,
        [LogEventType.RaidAlert]: this.logRaidAlert,
        [LogEventType.MemberNicknameModification]: this.logMemberNicknameModification,
        [LogEventType.GuildVerificationAttempt]: this.logGuildVerificationAttempt,
        [LogEventType.GuildVerificationSuccess]: this.logGuildVerificationSuccess,
        [LogEventType.GuildVerificationNotEnoughInfo]: this.logGuildVerificationNotEnoughInfo,
        [LogEventType.NewMemberMessageInspection]: this.logNewMemberMessageInspection
    };

    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    @GatewayEventListener("channelDelete")
    public onChannelDelete(channel: TextChannel) {
        if (this.webhooks.has(`${channel.guild.id}::${channel.id}`)) {
            this.webhooks.delete(`${channel.guild.id}::${channel.id}`);
        }
    }

    public override boot(): Awaitable<void> {
        this.reloadConfig();
    }

    public reloadConfig() {
        this.channels.clear();

        for (const guildId in this.configurationManager.config) {
            const config = this.configurationManager.config[guildId]?.logging;

            if (!config?.enabled) {
                continue;
            }

            const loadedEvents = new Set<LogEventType>();
            let index = 0;

            for (const override of config.overrides) {
                if (override.enabled) {
                    for (const event of override.events) {
                        if (loadedEvents.has(event)) {
                            this.application.logger.warn(
                                `Duplicate logging event ${event} found for guild ${guildId} in override #${index}. Ignoring.`
                            );

                            continue;
                        }

                        this.channels.set(`${guildId}::${event}`, override.channel);
                        loadedEvents.add(event);
                    }
                } else {
                    for (const event of override.events) {
                        this.channels.set(`${guildId}::${event}`, null);
                    }
                }

                index++;
            }
        }

        this.application.logger.debug("AuditLoggingService: Configuration reloaded");
    }

    public async emitLogEvent<T extends LogEventType>(guildId: Snowflake, type: T, ...args: LogEventArgs[T]) {
        const configManager = this.application.service("configManager");
        const config = configManager.config[guildId]?.logging;
        const defaultEnabled = config?.default_enabled ?? true;

        if (!config?.enabled) {
            return null;
        }

        const channel = this.channels.get(`${guildId}::${type}`);

        if ((defaultEnabled && channel === null) || (!defaultEnabled && channel === undefined)) {
            return null;
        }

        if (config.unsubscribed_events.includes(type)) {
            this.logger.debug("Unsubscribed event");
            return null;
        }

        for (const exclusion of config.exclusions) {
            if (this.testExclusion(exclusion, type, ...args)) {
                this.logger.debug("Exclusion triggered");
                return null;
            }
        }

        return this.logHandlers[type].call(this, ...args);
    }

    private testExclusion<T extends LogEventType>(exclusion: LoggingExclusionType, type: T, ...args: LogEventArgs[T]) {
        if (exclusion.events !== undefined) {
            const includes = exclusion.events.includes(type);

            if (!includes) {
                return exclusion.mode === "include";
            }
        }

        let target: string | string[] | undefined;

        this.logger.debug("Testing: ", type);

        switch (type) {
            case LogEventType.GuildMemberAdd:
            case LogEventType.GuildMemberRemove:
                if (exclusion.type === "user") {
                    target = (args[0] as GuildMember).id;
                }

                break;

            case LogEventType.MessageUpdate:
            case LogEventType.SystemUserMessageSave:
            case LogEventType.MessageDelete:
                if (exclusion.type === "user") {
                    target = (args[0] as Message<true>).author.id;
                } else if (exclusion.type === "channel") {
                    target = (args[0] as Message<true>).channelId;
                } else if (exclusion.type === "category_channel" && (args[0] as Message<true>).channel.parentId) {
                    target = (args[0] as Message<true>).channel.parentId!;
                }

                break;

            case LogEventType.MemberBanAdd:
            case LogEventType.MemberBanRemove:
            case LogEventType.UserNoteAdd:
            case LogEventType.MemberModeratorMessageAdd:
                if (exclusion.type === "user") {
                    target = (args[0] as { user: User }).user.id;
                }

                break;

            case LogEventType.MemberMassBan:
            case LogEventType.MemberMassKick:
            case LogEventType.MemberMassUnban:
            case LogEventType.RaidAlert:
                break;

            case LogEventType.GuildMemberKick:
            case LogEventType.MemberMuteAdd:
            case LogEventType.MemberMuteRemove:
            case LogEventType.MemberRoleModification:
            case LogEventType.MemberWarningAdd:
                if (exclusion.type === "user") {
                    target = (args[0] as { member: GuildMember }).member.id;
                }

                break;

            case LogEventType.MessageDeleteBulk:
                {
                    const payload = args[0] as LogMessageBulkDeletePayload;

                    if (exclusion.type === "user") {
                        target = payload.user?.id;
                    } else {
                        target =
                            exclusion.type === "channel" ? payload.channel.id : (payload.channel.parentId ?? undefined);
                    }
                }

                break;

            case LogEventType.SystemAutoModRuleModeration:
                {
                    const entity = args[1] as Message<true> | GuildMember;

                    if (entity instanceof Message) {
                        target =
                            exclusion.type === "category_channel"
                                ? (entity.channel.parentId ?? undefined)
                                : exclusion.type === "channel"
                                  ? entity.channelId
                                  : entity.author.id;
                    } else {
                        target = entity.id;
                    }
                }

                break;
        }

        if (target === undefined) {
            return false;
        }

        target = Array.isArray(target) ? target : [target];

        for (const id of exclusion.snowflakes) {
            const includes = target.includes(id);

            if (exclusion.mode === "exclude" && includes) {
                return true;
            }

            if (exclusion.mode === "include" && !includes) {
                return true;
            }
        }

        return false;
    }

    private configFor(guildId: Snowflake) {
        return this.configurationManager.config[guildId]?.logging;
    }

    private async send({ guildId, messageCreateOptions, eventType }: SendLogOptions): Promise<Message | undefined> {
        const guild = this.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const configManager = this.application.service("configManager");
        const config = configManager.config[guildId]?.logging;

        if (!config?.enabled) {
            return;
        }

        const overriddenChannel = this.channels.get(`${guildId}::${eventType}`);
        const defaultEnabled = config.default_enabled;
        const channelId =
            (eventType && overriddenChannel !== null ? overriddenChannel : config.primary_channel) ??
            config.primary_channel;

        if (!channelId) {
            this.application.logger.warn(`No logging channel found for guild ${guild.name} (${guild.id})`);
            return;
        }

        if (!overriddenChannel && !defaultEnabled) {
            return;
        }

        let webhookClient = this.webhooks.get(`${guildId}::${channelId}`);

        if (!webhookClient || webhookClient.status === "error") {
            this.application.logger.debug("LoggingService: Cache MISS");

            if (!webhookClient) {
                webhookClient = {
                    status: "error",
                    attempts: 0
                };

                this.webhooks.set(`${guildId}::${channelId}`, webhookClient);
            }

            if (webhookClient.attempts >= 3) {
                this.application.logger.warn(`Failed to find log webhook for guild ${guild.name} (${guild.id})`);
                this.application.logger.warn("Cancelling webhook fetch task for this channel");
                return;
            }

            webhookClient.attempts++;

            /*
                FIXME: Instead of fetching the channel, we should store the webhook
                       ID and token in the configuration/db and fetch the webhook directly.
            */
            const channel = guild.channels.cache.get(channelId) ?? (await fetchChannel(guildId, channelId));

            if (!channel) {
                this.application.logger.warn(`Couldn't fetch logging channel for guild ${guild.name} (${guild.id})`);
                return;
            }

            if (!channel.isTextBased()) {
                this.application.logger.warn(`Logging channel for guild ${guild.name} (${guild.id}) is not text based`);
                return;
            }

            if (channel instanceof TextChannel) {
                const hooks = await channel.fetchWebhooks();

                for (const hook of hooks.values()) {
                    if (config?.hooks?.[channel.id] === hook.id && hook.applicationId === this.client.application?.id) {
                        webhookClient = {
                            status: "success",
                            webhook: hook
                        };

                        this.webhooks.set(`${guildId}::${channelId}`, webhookClient);
                        this.application.logger.debug("LoggingService: Refreshed cache (hook found)");
                        break;
                    }
                }

                if (webhookClient.status === "error") {
                    this.application.logger.debug(`Couldn't find log webhook for guild ${guild.name} (${guild.id})`);
                    this.application.logger.debug(`Creating log webhook for guild ${guild.name} (${guild.id})`);

                    const webhook = await channel.createWebhook({
                        name: "SudoBot Logging",
                        avatar: this.client.user?.displayAvatarURL(),
                        reason: "Automatically creating logging webhook for SudoBot"
                    });

                    webhookClient = {
                        status: "success",
                        webhook
                    };

                    this.webhooks.set(`${guildId}::${channelId}`, webhookClient);

                    configManager.config[guildId]!.logging!.hooks ??= {};
                    configManager.config[guildId]!.logging!.hooks[channel.id] = webhook.id;
                    await configManager.write();
                }
            }
        } else {
            this.application.logger.debug("LoggingService: Cache HIT");
        }

        if (webhookClient.status === "error") {
            return;
        }

        const { webhook } = webhookClient;

        try {
            const message = await webhook.send({
                ...(messageCreateOptions as MessageCreateOptions),
                allowedMentions:
                    "allowedMentions" in messageCreateOptions && messageCreateOptions.allowedMentions
                        ? messageCreateOptions.allowedMentions
                        : {
                              parse: [],
                              roles: [],
                              users: []
                          }
            });

            webhookClient.useFailedAttempts = undefined;
            return message;
        } catch (error) {
            this.application.logger.error("Failed to send log message", error);

            if (isDiscordAPIError(error) && error.code === 10015) {
                webhookClient.useFailedAttempts ??= 0;
                webhookClient.useFailedAttempts++;

                if (webhookClient.useFailedAttempts >= 3) {
                    this.application.logger.warn("Failed to send log message 3 times, removing webhook from cache");

                    this.webhooks.delete(`${guildId}::${channelId}`);
                }
            }
        }
    }

    private ruleAttributes(rule: MessageRuleType) {
        let attributes = "";
        const { bail, mode, exceptions, for: ruleFor } = rule;

        if (bail) {
            attributes += `${bold("Bail")}: Skipped rules next to this one, as this one matched\n`;
        }

        if (mode === "invert") {
            attributes += `${bold("Inverted")}: This rule will only match if the condition is not met\n`;
        }

        if (exceptions && Object.keys(exceptions).length) {
            attributes += `${bold("Exceptions")}: There are exceptions set for this rule.\n`;
        }

        if (ruleFor && Object.keys(ruleFor).length) {
            attributes += `${bold("Conditional")}: This rule only applies when certain conditions are met.\n`;
        }

        return attributes === "" ? italic("No additional attributes") : attributes;
    }

    private async logMessageRuleModeration(
        type: "profile" | "message",
        messageOrMember: Message | GuildMember,
        rule: MessageRuleType,
        result: RuleExecResult
    ) {
        const member = messageOrMember instanceof GuildMember ? messageOrMember : messageOrMember.member!;
        const message = messageOrMember instanceof Message ? messageOrMember : undefined;

        return this.send({
            guildId: message?.guildId ?? member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        ...result.logEmbed,
                        color: Colors.Red,
                        fields: [
                            ...(result.fields ?? []),
                            ...(result.logEmbed?.fields ?? []),
                            {
                                name: "Rule Type",
                                value: inlineCode(rule.type)
                            },
                            {
                                name: "Action Taken By",
                                value: "System"
                            },
                            {
                                name: "User",
                                value: userInfo(message?.author ?? member.user)
                            },
                            {
                                name: "Reason",
                                value: result.reason ?? italic("No reason provided")
                            },
                            {
                                name: "Actions Taken",
                                value: this.application
                                    .service("moderationActionService")
                                    .summarizeActions(rule.actions),
                                inline: true
                            },
                            {
                                name: "Additional Attributes",
                                value: this.ruleAttributes(rule),
                                inline: true
                            }
                        ],
                        title: "AutoMod Rule Action",
                        author: {
                            name: (message?.author ?? member.user).username,
                            icon_url: (message?.author ?? member.user).displayAvatarURL() ?? undefined
                        }
                    }
                ]
            },
            eventType: LogEventType.SystemAutoModRuleModeration
        });
    }

    private async logMessageDelete(message: Message<true>, moderator?: User) {
        const fields = [
            {
                name: "Channel",
                value: channelInfo(message.channel),
                inline: true
            },
            {
                name: "Message",
                value: messageInfo(message),
                inline: true
            },
            {
                name: "User",
                value: userInfo(message.author)
            },
            {
                name: "User ID",
                value: message.author.id
            }
        ];

        if (moderator) {
            fields.push({
                name: "Responsible Moderator",
                value: userInfo(moderator)
            });
        }

        let infoText = "";

        if (message.reference?.type === MessageReferenceType.Forward) {
            infoText += `${bold("Type:")} Forward\n`;
        }

        if (message.embeds.length > 0) {
            infoText += `${bold("Embeds:")} ${message.embeds.length.toString()}\n`;
        }

        if (infoText) {
            fields.push({
                name: "Additional Information",
                value: infoText
            });
        }

        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(message.url).setLabel("Context")
            )
        ];

        if (message.reference) {
            components.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(
                            `https://discord.com/channels/${message.guild.id}/${message.reference.channelId}/${message.reference.messageId}`
                        )
                        .setLabel(
                            message.reference.type === MessageReferenceType.Forward
                                ? "Forwarded Message"
                                : "Referenced Message"
                        )
                )
            );
        }

        return this.send({
            guildId: message.guild.id,
            messageCreateOptions: {
                files: message.attachments.map(
                    attachment =>
                        ({
                            attachment: attachment.proxyURL,
                            name: attachment.name
                        }) as AttachmentBuilder
                ),
                embeds: [
                    {
                        title: "Message Deleted",
                        author: {
                            name: message.author.username,
                            icon_url: message.author.displayAvatarURL() ?? undefined
                        },
                        description: message.content,
                        color: Colors.Red,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Deleted"
                        }
                    }
                ],
                components
            },
            eventType: LogEventType.MessageDelete
        });
    }

    private async logMessageUpdate(oldMessage: Message<true>, newMessage: Message<true>) {
        const fields = [
            {
                name: "Channel",
                value: channelInfo(oldMessage.channel),
                inline: true
            },
            {
                name: "Message",
                value: messageInfo(newMessage)
            },
            {
                name: "User",
                value: userInfo(oldMessage.author)
            },
            {
                name: "User ID",
                value: oldMessage.author.id
            }
        ];

        let infoText = "";

        if (newMessage.reference?.type === MessageReferenceType.Forward) {
            infoText += `${bold("Type:")} Forward\n`;
        }

        if (infoText) {
            fields.push({
                name: "Additional Information",
                value: infoText
            });
        }

        const embeds: APIEmbed[] = [
            {
                title: "Message Updated",
                author: {
                    name: newMessage.author.username,
                    icon_url: newMessage.author.displayAvatarURL() ?? undefined
                },
                color: Colors.Primary,
                timestamp: new Date().toISOString(),
                fields,
                footer: {
                    text: "Updated"
                }
            }
        ];

        if (oldMessage.content !== newMessage.content) {
            const content = `### Before\n${oldMessage.content}\n### After\n${newMessage.content}`;
            const tooLarge = content.length >= 2000;

            if (tooLarge) {
                const beforeChunks = chunkedString(`## Before\n${oldMessage.content}`, 2000);

                for (const chunk of beforeChunks) {
                    embeds.push({
                        color: Colors.Primary,
                        description: chunk
                    });
                }

                const afterChunks = chunkedString(`## After\n${newMessage.content}`, 2000);

                for (const chunk of afterChunks) {
                    embeds.push({
                        color: Colors.Primary,
                        description: chunk
                    });
                }
            } else {
                embeds[0].description = content;
            }
        }

        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(newMessage.url).setLabel("Context")
            )
        ];

        if (newMessage.reference) {
            components.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(
                            `https://discord.com/channels/${newMessage.guild.id}/${newMessage.reference.channelId}/${newMessage.reference.messageId}`
                        )
                        .setLabel(
                            newMessage.reference.type === MessageReferenceType.Forward
                                ? "Forwarded Message"
                                : "Referenced Message"
                        )
                )
            );
        }

        return this.send({
            guildId: newMessage.guild.id,
            messageCreateOptions: {
                embeds,
                components
            },
            eventType: LogEventType.MessageUpdate
        });
    }

    private async logMessageDeleteBulk({
        channel,
        messages,
        moderator,
        reason,
        infractionId,
        user
    }: LogMessageBulkDeletePayload) {
        const firstMessage = messages.first() as Message<true>;
        const fields: APIEmbedField[] = [
            {
                name: "Channel",
                value: channelInfo(channel),
                inline: true
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        if (moderator) {
            fields.push({
                name: "Responsible Moderator",
                value: userInfo(moderator)
            });
        }

        if (user) {
            fields.push({
                name: "User",
                value: userInfo(user)
            });
        }

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: firstMessage.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: "Bulk Message Deletion",
                        description: `Deleted **${messages.size}** messages in ${channel}.`,
                        color: Colors.DarkRed,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Deleted"
                        }
                    }
                ],
                files: [
                    {
                        attachment: Buffer.from(
                            JSON.stringify(
                                messages.filter((m): m is Message | PartialMessage => !!m).map(m => m.toJSON()),
                                null,
                                2
                            ),
                            "utf-8"
                        ),
                        name: "deleted_messages.json"
                    }
                ]
            },
            eventType: LogEventType.MessageDeleteBulk
        });
    }

    private async logMessageReactionClear({
        channel,
        reactions,
        moderator,
        reason,
        infractionId,
        user
    }: LogMessageReactionClearPayload) {
        const fields: APIEmbedField[] = [
            {
                name: "Channel",
                value: channelInfo(channel),
                inline: true
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        if (moderator) {
            fields.push({
                name: "Responsible Moderator",
                value: userInfo(moderator)
            });
        }

        if (user) {
            fields.push({
                name: "User",
                value: userInfo(user)
            });
        }

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: channel.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: "Bulk Reaction Deletion",
                        description: `Deleted **${reactions.length}** message reactions in ${channel}.`,
                        color: Colors.DarkRed,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Deleted"
                        }
                    }
                ]
            },
            eventType: LogEventType.MessageReactionClear
        });
    }

    private async logMemberBanAdd({
        guild,
        moderator,
        user,
        duration,
        reason,
        infractionId,
        deletionTimeframe
    }: LogMemberBanAddPayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: !moderator ? "[Unknown]" : userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: user.id
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            },
            {
                name: "Duration",
                value: duration?.toString() ?? italic("Permanent"),
                inline: true
            },
            {
                name: "Message Deletion Timeframe",
                value: deletionTimeframe?.toString() ?? italic("None"),
                inline: true
            }
        ];

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: user.username,
                            icon_url: user.displayAvatarURL() ?? undefined
                        },
                        title: "User Banned",
                        color: Colors.Red,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Banned"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberBanAdd
        });
    }

    private async logMemberBanRemove({ guild, moderator, user, reason, infractionId }: LogMemberBanRemovePayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: !moderator ? "[Unknown]" : userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: user.id
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: user.username,
                            icon_url: user.displayAvatarURL() ?? undefined
                        },
                        title: "User Unbanned",
                        color: Colors.Green,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Unbanned"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberBanRemove
        });
    }

    private async logMemberMassBan({
        guild,
        moderator,
        users,
        reason,
        deletionTimeframe,
        duration
    }: LogMemberMassBanPayload) {
        const fields = [
            {
                name: "Responsible Moderator",
                value: !moderator ? "[Unknown]" : userInfo(moderator),
                inline: true
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            },
            {
                name: "Duration",
                value: duration?.toString() ?? italic("Permanent"),
                inline: true
            },
            {
                name: "Message Deletion Timeframe",
                value: deletionTimeframe?.toString() ?? italic("None"),
                inline: true
            }
        ];

        let description = "";

        for (const resolvable of users) {
            const id = typeof resolvable === "string" ? resolvable : resolvable.id;
            description += `${userMention(id)} (${id})\n`;
        }

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: `Mass Banned ${users.length} users`,
                        color: Colors.Red,
                        timestamp: new Date().toISOString(),
                        description: description.length < 2000 ? description : undefined,
                        fields,
                        footer: {
                            text: "Banned"
                        }
                    }
                ],
                files:
                    description.length >= 2000
                        ? [
                              {
                                  attachment: Buffer.from(description, "utf-8"),
                                  name: "banned_user_list.txt"
                              }
                          ]
                        : undefined
            },
            eventType: LogEventType.MemberMassBan
        });
    }

    private async logMemberMassKick({ guild, moderator, members, reason }: LogMemberMassKickPayload) {
        const fields = [
            {
                name: "Responsible Moderator",
                value: !moderator ? "[Unknown]" : userInfo(moderator),
                inline: true
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        let description = "";

        for (const resolvable of members) {
            const id = typeof resolvable === "string" ? resolvable : resolvable.id;
            description += `${userMention(id)} (${id})\n`;
        }

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: `Mass Kicked ${members.length} users`,
                        color: Colors.Red,
                        timestamp: new Date().toISOString(),
                        description: description.length < 2000 ? description : undefined,
                        fields,
                        footer: {
                            text: "Kicked"
                        }
                    }
                ],
                files:
                    description.length >= 2000
                        ? [
                              {
                                  attachment: Buffer.from(description, "utf-8"),
                                  name: "kicked_user_list.txt"
                              }
                          ]
                        : undefined
            },
            eventType: LogEventType.MemberMassKick
        });
    }

    private async logMemberMassUnban({ guild, moderator, users, reason }: LogMemberMassUnbanPayload) {
        const fields = [
            {
                name: "Responsible Moderator",
                value: !moderator ? "[Unknown]" : userInfo(moderator),
                inline: true
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        let description = "";

        for (const resolvable of users) {
            const id = typeof resolvable === "string" ? resolvable : resolvable.id;
            description += `${userMention(id)} (${id})\n`;
        }

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: `Mass Unbanned ${users.length} users`,
                        color: Colors.Green,
                        timestamp: new Date().toISOString(),
                        description: description.length < 2000 ? description : undefined,
                        fields,
                        footer: {
                            text: "Unbanned"
                        }
                    }
                ],
                files:
                    description.length >= 2000
                        ? [
                              {
                                  attachment: Buffer.from(description, "utf-8"),
                                  name: "unbanned_user_list.txt"
                              }
                          ]
                        : undefined
            },
            eventType: LogEventType.MemberMassUnban
        });
    }

    private async logGuildMemberAdd(member: GuildMember) {
        const memberCount = Math.max(member.guild.members.cache.size, member.guild.memberCount);
        const fields: APIEmbedField[] = [
            {
                name: "New Account?",
                value: Date.now() - member.user.createdTimestamp > 604800000 ? "No" : "⚠️ Yes ⚠️", // 7 days
                inline: true
            },
            {
                name: "Bot?",
                value: member.user.bot ? "Yes" : "No",
                inline: true
            },
            {
                name: "Account Created At",
                value: `${time(member.user.createdAt, "f")} (${time(member.user.createdAt, "R")})`
            },
            {
                name: "User Information",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Positions",
                value:
                    `Among all the members: ${memberCount}\n` +
                    (member.user.bot
                        ? `Among all the bot members: ${member.guild.members.cache.filter(m => m.user.bot).size}`
                        : `Among all the human members: ${member.guild.members.cache.filter(m => !m.user.bot).size}`)
            },
            {
                name: "User ID",
                value: member.id
            }
        ];

        const invite = await this.application.service("inviteTrackingService").findInviteForMember(member);

        if (invite) {
            let value = `**Link:** ${invite.url}\n`;

            value += `Inviter: ${invite.inviterId ? `<@${invite.inviterId}> (${invite.inviterId})` : "*Unavailable*"}\n`;
            value += `Uses: ${invite.uses} / ${invite.maxUses ?? "∞"}\n`;
            value += `Expires: ${invite.expiresAt ? time(invite.expiresAt, "R") : "*Unavailable*"}`;

            fields.push({
                name: "Invite Information",
                value
            });
        }

        return this.send({
            guildId: member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "New Member Joined",
                        thumbnail: {
                            url: member.user.displayAvatarURL() ?? undefined
                        },
                        color: Colors.Primary,
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: `Joined • ${member.guild.memberCount} members total`
                        },
                        fields
                    }
                ]
            },
            eventType: LogEventType.GuildMemberAdd
        });
    }

    private async logMemberNicknameModification({
        guild,
        member,
        newNickname,
        oldNickname,
        moderator
    }: LogMemberNicknameModificationPayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "User ID",
                value: member.id
            },
            {
                name: "Old Nickname",
                value: oldNickname ?? italic("None"),
                inline: true
            },
            {
                name: "New Nickname",
                value: newNickname ?? italic("None"),
                inline: true
            }
        ];

        if (moderator) {
            fields.push({
                name: "Responsible Moderator",
                value: userInfo(moderator)
            });
        }

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Member Nickname Modified",
                        color: Colors.Blue,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Modified"
                        }
                    }
                ]
            }
        });
    }

    private async logGuildMemberRemove(member: GuildMember) {
        const memberCount = Math.max(member.guild.members.cache.size, member.guild.memberCount);
        const fields = [
            {
                name: "User Information",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Joined At",
                value: member.joinedAt ? `${time(member.joinedAt, "f")} (${time(member.joinedAt, "R")})` : "[Unknown]"
            },
            {
                name: "Roles",
                value:
                    member.roles.cache.size > 1
                        ? member.roles.cache
                              .filter(r => r.id !== member.guild.id)
                              .map(r => roleMention(r.id))
                              .join(", ")
                        : italic("None")
            },
            {
                name: "User ID",
                value: member.id,
                inline: true
            },
            {
                name: "Bot?",
                value: member.user.bot ? "Yes" : "No"
            }
        ];

        return this.send({
            guildId: member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Member Left",
                        color: Colors.Red,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: `Left • ${memberCount} members total`
                        }
                    }
                ],
                allowedMentions: {
                    parse: [],
                    roles: [],
                    users: []
                }
            },
            eventType: LogEventType.GuildMemberRemove
        });
    }

    private async logGuildMemberKick({ member, infractionId, moderator, reason }: LogMemberKickPayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: !moderator ? "[Unknown]" : userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: member.id
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Member Kicked",
                        color: Colors.DarkGold,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Kicked"
                        }
                    }
                ]
            },
            eventType: LogEventType.GuildMemberKick
        });
    }

    private async logGuildVerificationNotEnoughInfo({ member, ip }: LogGuildVerificationNotEnoughInfoPayload) {
        const fields = [
            {
                name: "Member",
                value: userInfo(member.user)
            }
        ];

        if (ip) {
            fields.push({
                name: "IP Address",
                value: ip
            });
        }

        return this.send({
            guildId: member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: "Not enough information",
                        description: "The system could not collect enough information to check for alt accounts.",
                        color: Colors.Blue,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Aborted"
                        }
                    }
                ]
            },
            eventType: LogEventType.GuildVerificationNotEnoughInfo
        });
    }

    private async logGuildVerificationAttempt({
        member,
        reason,
        actionsTaken,
        altAccountIds,
        incomplete
    }: LogGuildVerificationAttemptPayload) {
        const fields = [
            {
                name: "Member",
                value: userInfo(member.user)
            }
        ];

        if (reason) {
            fields.push({
                name: "Reason of Log",
                value: reason
            });
        }

        if (altAccountIds?.length) {
            fields.push({
                name: "Possible Alt Account(s)",
                value: altAccountIds.map(altAccountId => `<@${altAccountId}> [${altAccountId}]`).join("\n")
            });
        }

        if (actionsTaken?.length) {
            fields.push({
                name: "Actions Taken",
                value: this.application.service("moderationActionService").summarizeActions(actionsTaken)
            });
        }

        if (incomplete) {
            fields.push({
                name: "Incomplete Alt Detection",
                value: "The system could not collect enough data to check for alt accounts."
            });
        }

        return this.send({
            guildId: member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: "Verification Attempt",
                        color: Colors.Blue,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Attempted"
                        }
                    }
                ]
            },
            eventType: LogEventType.GuildVerificationAttempt
        });
    }

    private async logGuildVerificationSuccess({
        member,
        altAccountIds,
        incomplete
    }: LogGuildVerificationSuccessPayload) {
        const fields = [
            {
                name: "Member",
                value: userInfo(member.user)
            }
        ];

        if (altAccountIds?.length) {
            fields.push({
                name: "Possible Alt Account(s)",
                value: altAccountIds.map(altAccountId => `<@${altAccountId}> [${altAccountId}]`).join("\n")
            });
        }

        if (incomplete) {
            fields.push({
                name: "Incomplete Alt Detection",
                value: "The system could not collect enough data to check for alt accounts."
            });
        }

        return this.send({
            guildId: member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: "Verification Success",
                        color: Colors.Success,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Success"
                        }
                    }
                ]
            },
            eventType: LogEventType.GuildVerificationSuccess
        });
    }

    private async logMemberMute({ guild, member, moderator, infractionId, reason, duration }: LogMemberMuteAddPayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: member.id
            }
        ];

        if (duration) {
            fields.push({
                name: "Duration",
                value: duration.toString()
            });
        }

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        fields.push({
            name: "Reason",
            value: reason ?? italic("No reason provided")
        });

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Member Muted",
                        color: Colors.Red,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Muted"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberMuteAdd
        });
    }

    private async logMemberUnmute({ guild, member, moderator, infractionId, reason }: LogMemberMuteRemovePayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: member.id
            }
        ];

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        fields.push({
            name: "Reason",
            value: reason ?? italic("No reason provided")
        });

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Member Unmuted",
                        color: Colors.Green,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Unmuted"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberMuteRemove
        });
    }

    private async logMemberTimeoutAdd({ guild, member, moderator, infractionId, reason, duration }: LogMemberTimeoutAddPayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: member.id
            }
        ];

        if (duration) {
            fields.push({
                name: "Duration",
                value: duration.toString()
            });
        }

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        fields.push({
            name: "Reason",
            value: reason ?? italic("No reason provided")
        });

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Member Timed Out",
                        color: Colors.Red,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Timed out"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberTimeoutAdd
        });
    }

    private async logMemberTimeoutRemove({ guild, member, moderator, infractionId, reason }: LogMemberTimeoutRemovePayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: member.id
            }
        ];

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        fields.push({
            name: "Reason",
            value: reason ?? italic("No reason provided")
        });

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Member Timeout Removed",
                        color: Colors.Green,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Removed"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberTimeoutRemove
        });
    }

    private async logMemberWarn({ infractionId, member, moderator, reason }: LogMemberWarningAddPayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: member.id
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Member Warned",
                        color: Colors.Gold,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Warned"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberWarningAdd
        });
    }

    private async logMemberModMessageAdd({ infractionId, member, moderator, reason }: LogMemberModMessageAddPayload) {
        const fields = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: member.id
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: member.guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Moderator Message was sent to a member",
                        color: Colors.Gold,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Sent"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberModeratorMessageAdd
        });
    }

    private async logUserNoteAdd({ infractionId, user, moderator, reason, guild }: LogUserNoteAddPayload) {
        const fields: APIEmbedField[] = [
            {
                name: "User",
                value: userInfo(user),
                inline: true
            },
            {
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            },
            {
                name: "User ID",
                value: user.id
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        ];

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: user.username,
                            icon_url: user.displayAvatarURL() ?? undefined
                        },
                        title: "Note added",
                        color: Colors.Grey,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Added"
                        }
                    }
                ]
            },
            eventType: LogEventType.UserNoteAdd
        });
    }

    private async logMemberRoleModification({
        added,
        guild,
        member,
        removed,
        infractionId,
        moderator,
        reason
    }: LogMemberRoleModificationPayload) {
        if (!added && !removed) {
            this.application.logger.warn(
                "AuditLoggingService: No roles were added or removed from the member. This should not happen!"
            );
            return;
        }

        const fields: APIEmbedField[] = [
            {
                name: "User",
                value: userInfo(member.user),
                inline: true
            }
        ];

        if (moderator) {
            fields.push({
                name: "Responsible Moderator",
                value: userInfo(moderator),
                inline: true
            });
        }

        fields.push(
            {
                name: "User ID",
                value: member.id
            },
            {
                name: "Reason",
                value: reason ?? italic("No reason provided")
            }
        );

        if (added) {
            fields.push({
                name: "Added",
                value: added.map(r => roleMention(r)).join(", ")
            });
        }

        if (removed) {
            fields.push({
                name: "Removed",
                value: removed.map(r => roleMention(r)).join(", ")
            });
        }

        if (typeof infractionId === "number") {
            fields.push({
                name: "Infraction ID",
                value: infractionId.toString()
            });
        }

        return this.send({
            guildId: guild.id,
            messageCreateOptions: {
                embeds: [
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        title: "Role(s) modified for member",
                        color: Colors.Primary,
                        timestamp: new Date().toISOString(),
                        fields,
                        footer: {
                            text: "Modified"
                        }
                    }
                ]
            },
            eventType: LogEventType.MemberRoleModification
        });
    }

    private async logSystemUserMessageSave(message: Message, moderator: User) {
        return this.send({
            guildId: message.guild!.id,
            messageCreateOptions: {
                embeds: [
                    {
                        title: "Message Saved",
                        author: {
                            name: message.author.username,
                            icon_url: message.author.displayAvatarURL() ?? undefined
                        },
                        description: message.content,
                        color: Colors.Green,
                        timestamp: new Date().toISOString(),
                        fields: [
                            {
                                name: "Saved By",
                                value: userInfo(moderator)
                            }
                        ]
                    }
                ],
                files: message.attachments.map(
                    attachment =>
                        ({
                            attachment: attachment.proxyURL,
                            name: attachment.name
                        }) as AttachmentBuilder
                )
            },
            eventType: LogEventType.SystemUserMessageSave
        });
    }

    public async logRaidAlert({ actions, serverAction, guild, membersJoined, duration }: LogRaidAlertPayload) {
        return this.send({
            guildId: guild.id,
            eventType: LogEventType.RaidAlert,
            messageCreateOptions: {
                embeds: [
                    {
                        title: "Raid Alert",
                        description: `Detected a potential raid. **${membersJoined}** members joined in the last **${formatDistanceToNowStrict(Date.now() - duration)}**.`,
                        color: Colors.Red,
                        fields: [
                            {
                                name: "Action for Server",
                                value:
                                    serverAction === "antijoin"
                                        ? "Anti-Join Mode"
                                        : serverAction === "lock"
                                          ? "Lockdown Mode"
                                          : serverAction === "lock_and_antijoin"
                                            ? "Lockdown and Anti-Join Mode"
                                            : "None",
                                inline: true
                            },
                            {
                                name: "Actions for Members",
                                value:
                                    actions.length === 0
                                        ? "None"
                                        : this.application.service("moderationActionService").summarizeActions(actions),

                                inline: true
                            }
                        ],
                        timestamp: new Date().toISOString()
                    }
                ]
            }
        });
    }

    public async logNewMemberMessageInspection({
        data,
        member,
        message,
        mentions
    }: LogNewMemberMessageInspectionPayload) {
        let categorySummary = "";

        if (data.content_moderation) {
            for (const key in data.content_moderation.categories) {
                const value = data.content_moderation.categories[key];
                categorySummary += `${bold(key)}: ${value.flagged ? "flagged" : "not flagged"}, score ${value.score}, threshold ${value.threshold}\n`;
            }
        }

        return this.send({
            guildId: message.guild!.id,
            messageCreateOptions: {
                content: mentions.length > 0 ? mentions.map(m => `<@${m}>`).join(" ") : undefined,
                allowedMentions: {
                    users: mentions,
                    roles: []
                },
                embeds: [
                    {
                        title: "New Member Message Inspection Log",
                        description: "The following message was flagged as suspicious by the system.",
                        color: Colors.Gold,
                        timestamp: new Date().toISOString(),
                        fields: [
                            {
                                name: "Reason",
                                value: data.reason || italic("No reason provided")
                            },
                            {
                                name: "Summary",
                                value: categorySummary || italic("Not available")
                            },
                            {
                                name: "User",
                                value: userInfo(member.user),
                                inline: true
                            },
                            {
                                name: "Message",
                                value: messageInfo(message),
                                inline: true
                            },
                            {
                                name: "Channel",
                                value: channelInfo(message.channel as GuildBasedChannel),
                                inline: true
                            }
                        ]
                    },
                    {
                        author: {
                            name: member.user.username,
                            icon_url: member.user.displayAvatarURL() ?? undefined
                        },
                        color: Colors.Gold,
                        description: message.content,
                        timestamp: message.createdAt.toISOString()
                    }
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(message.url).setLabel("Context")
                    )
                ]
            },
            eventType: LogEventType.SystemUserMessageSave
        });
    }
}

type SendLogOptions = {
    messageCreateOptions: MessageCreateOptions | MessagePayload;
    guildId: Snowflake;
    eventType?: LogEventType;
};

export default AuditLoggingService;
