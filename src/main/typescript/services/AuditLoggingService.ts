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
    LogMemberBanAddPayload,
    LogMemberBanRemovePayload,
    LogMemberKickPayload,
    LogMemberMassBanPayload,
    LogMemberMassKickPayload,
    LogMemberMassUnbanPayload,
    LogMemberModMessageAddPayload,
    LogMemberMuteAddPayload,
    LogMemberMuteRemovePayload,
    LogMemberRoleModificationPayload,
    LogMemberWarningAddPayload,
    LogMessageBulkDeletePayload,
    LogUserNoteAddPayload
} from "@main/schemas/LoggingSchema";
import { MessageRuleType } from "@main/schemas/MessageRuleSchema";
import { ModerationAction } from "@main/schemas/ModerationAction";
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
    GuildMember,
    Message,
    MessageCreateOptions,
    MessagePayload,
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
        [LogEventType.MemberWarningAdd]: this.logMemberWarn,
        [LogEventType.MemberModeratorMessageAdd]: this.logMemberModMessageAdd,
        [LogEventType.UserNoteAdd]: this.logUserNoteAdd,
        [LogEventType.MemberRoleModification]: this.logMemberRoleModification,
        [LogEventType.SystemAutoModRuleModeration]: this.logMessageRuleModeration,
        [LogEventType.SystemUserMessageSave]: this.logSystemUserMessageSave
    };

    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    @GatewayEventListener("channelDelete")
    public onChannelDelete(channel: TextChannel) {
        if (this.webhooks.has(`${channel.guild.id}::${channel.id}`)) {
            this.webhooks.delete(`${channel.guild.id}::${channel.id}`);
        }
    }

    private configFor(guildId: Snowflake) {
        return this.configurationManager.config[guildId!]?.logging;
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
                    this.channels.set(`${guildId}::${LogEventType.MessageDelete}`, null);
                }

                index++;
            }
        }

        this.application.logger.debug("AuditLoggingService: Configuration reloaded");
    }

    private async send({
        guildId,
        messageCreateOptions,
        eventType
    }: SendLogOptions): Promise<Message | undefined> {
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
            (eventType && overriddenChannel !== null
                ? overriddenChannel
                : config.primary_channel) ?? config.primary_channel;

        if (!channelId) {
            this.application.logger.warn(
                `No logging channel found for guild ${guild.name} (${guild.id})`
            );
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
                this.application.logger.warn(
                    `Failed to find log webhook for guild ${guild.name} (${guild.id})`
                );
                this.application.logger.warn("Cancelling webhook fetch task for this channel");
                return;
            }

            webhookClient.attempts++;

            /* 
                FIXME: Instead of fetching the channel, we should store the webhook 
                       ID and token in the configuration/db and fetch the webhook directly.
            */
            const channel =
                guild.channels.cache.get(channelId) ?? (await fetchChannel(guildId, channelId));

            if (!channel) {
                this.application.logger.warn(
                    `Couldn't fetch logging channel for guild ${guild.name} (${guild.id})`
                );
                return;
            }

            if (!channel.isTextBased()) {
                this.application.logger.warn(
                    `Logging channel for guild ${guild.name} (${guild.id}) is not text based`
                );
                return;
            }

            if (channel instanceof TextChannel) {
                const hooks = await channel.fetchWebhooks();

                for (const hook of hooks.values()) {
                    if (
                        config?.hooks?.[channel.id] === hook.id &&
                        hook.applicationId === this.client.application?.id
                    ) {
                        webhookClient = {
                            status: "success",
                            webhook: hook
                        };

                        this.webhooks.set(`${guildId}::${channelId}`, webhookClient);
                        this.application.logger.debug(
                            "LoggingService: Refreshed cache (hook found)"
                        );
                        break;
                    }
                }

                if (webhookClient.status === "error") {
                    this.application.logger.debug(
                        `Couldn't find log webhook for guild ${guild.name} (${guild.id})`
                    );
                    this.application.logger.debug(
                        `Creating log webhook for guild ${guild.name} (${guild.id})`
                    );

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
                    configManager.config[guildId]!.logging!.hooks![channel.id] = webhook.id;
                    await configManager.write();
                }
            }
        }

        if (webhookClient.status === "error") {
            return;
        }

        this.application.logger.debug("LoggingService: Cache HIT");

        const { webhook } = webhookClient;

        try {
            const message = await webhook.send({
                ...(messageCreateOptions as MessageCreateOptions),
                allowedMentions: {
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
                    this.application.logger.warn(
                        "Failed to send log message 3 times, removing webhook from cache"
                    );

                    this.webhooks.delete(`${guildId}::${channelId}`);
                }
            }
        }
    }

    public async emitLogEvent<T extends LogEventType>(
        guildId: Snowflake,
        type: T,
        ...args: LogEventArgs[T]
    ) {
        const configManager = this.application.service("configManager");
        const config = configManager.config[guildId]?.logging;
        const defaultEnabled = config?.default_enabled ?? true;

        if (!config?.enabled) {
            return null;
        }

        const channel = this.channels.get(`${guildId}::${type}`);

        if ((defaultEnabled && channel === null) || (!defaultEnabled && !channel)) {
            return null;
        }

        return this.logHandlers[type].call(this, ...args);
    }

    private commonSummary(action: ModerationAction, name: string) {
        let summary = bold(name) + "\n";

        if ("duration" in action && action.duration) {
            summary += `Duration: ${formatDistanceToNowStrict(Date.now() - action.duration)}\n`;
        }

        if ("notify" in action) {
            summary += `Notification: ${action.notify ? "Delivered" : "Not delivered"}\n`;
        }

        return summary;
    }

    private summarizeActions(actions: ModerationAction[]) {
        let summary = "";

        for (const action of actions) {
            switch (action.type) {
                case "ban":
                    summary += this.commonSummary(action, "Banned");
                    break;
                case "mute":
                    summary += this.commonSummary(action, "Muted");
                    break;
                case "kick":
                    summary += this.commonSummary(action, "Kicked");
                    break;
                case "warn":
                    summary += this.commonSummary(action, "Warned");
                    break;
                case "clear":
                    summary += this.commonSummary(action, "Cleared recent messages");
                    summary += `Count: ${action.count ?? italic("None")}\n`;
                    break;
                case "role":
                    summary += this.commonSummary(
                        action,
                        `Roles ${action.mode === "give" ? "Added" : "Removed"}`
                    );
                    summary += `Roles: ${action.roles.map(r => roleMention(r)).join(", ")}\n`;
                    break;
                case "verbal_warn":
                    summary += this.commonSummary(action, "Verbally Warned");
                    break;
                case "delete_message":
                    summary += bold("Deleted Message") + "\n";
                    break;
                default:
                    throw new Error(`Unknown action type: ${action.type}`);
            }
        }

        return summary === "" ? italic("No actions taken") : summary;
    }

    private ruleAttributes(rule: MessageRuleType) {
        let attributes = "";
        const { bail, mode, exceptions, for: ruleFor } = rule;

        if (bail) {
            attributes += `${bold("Bail")}: Skipped rules next to this one, as this one matched\n`;
        }

        if (mode === "invert") {
            attributes += `${bold("Inverted")}: Rule will only match if the condition is not met\n`;
        }

        if (exceptions) {
            attributes += `${bold("Exceptions")}: There are exceptions set for this rule.\n`;
        }

        if (ruleFor) {
            attributes += `${bold("Conditional")}: This rule only applies when certain conditions are met.\n`;
        }

        return attributes === "" ? italic("No additional attributes") : attributes;
    }

    private async logMessageRuleModeration(
        message: Message,
        rule: MessageRuleType,
        result: RuleExecResult
    ) {
        return this.send({
            guildId: message.guildId!,
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
                                name: "Reason",
                                value: result.reason ?? italic("No reason provided")
                            },
                            {
                                name: "Actions Taken",
                                value: this.summarizeActions(rule.actions),
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
                            name: message.author.username,
                            icon_url: message.author.displayAvatarURL() ?? undefined
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

        if (message.embeds.length > 0) {
            fields.push({
                name: "Additional Information",
                value: `+ ${bold(message.embeds.length.toString())} embed${message.embeds.length === 1 ? "" : "s"}`
            });
        }

        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(message.url)
                    .setLabel("Context")
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
                        .setLabel("Referenced Message")
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
                value: channelInfo(oldMessage.channel!),
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
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(newMessage.url)
                    .setLabel("Context")
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
                        .setLabel("Referenced Message")
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
                                messages
                                    .filter((m): m is Message | PartialMessage => !!m)
                                    .map(m => m.toJSON()),
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

    private async logMemberBanRemove({
        guild,
        moderator,
        user,
        reason,
        infractionId
    }: LogMemberBanRemovePayload) {
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

    private async logMemberMassKick({
        guild,
        moderator,
        members,
        reason
    }: LogMemberMassKickPayload) {
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

    private async logMemberMassUnban({
        guild,
        moderator,
        users,
        reason
    }: LogMemberMassUnbanPayload) {
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

    // TODO: Invite tracing
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
                        ? `Among all the bot members: ${
                              member.guild.members.cache.filter(m => m.user.bot).size
                          }`
                        : `Among all the human members: ${
                              member.guild.members.cache.filter(m => !m.user.bot).size
                          }`)
            },
            {
                name: "User ID",
                value: member.id
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
                value: member.joinedAt
                    ? `${time(member.joinedAt, "f")} (${time(member.joinedAt, "R")})`
                    : "[Unknown]"
            },
            {
                name: "Roles",
                value:
                    member.roles.cache.size > 1
                        ? member.roles.cache.map(r => roleMention(r.id)).join(", ")
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

    private async logGuildMemberKick({
        member,
        infractionId,
        moderator,
        reason
    }: LogMemberKickPayload) {
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

    private async logMemberMute({
        guild,
        member,
        moderator,
        infractionId,
        reason,
        duration
    }: LogMemberMuteAddPayload) {
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

    private async logMemberUnmute({
        guild,
        member,
        moderator,
        infractionId,
        reason
    }: LogMemberMuteRemovePayload) {
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

    private async logMemberWarn({
        infractionId,
        member,
        moderator,
        reason
    }: LogMemberWarningAddPayload) {
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

    private async logMemberModMessageAdd({
        infractionId,
        member,
        moderator,
        reason
    }: LogMemberModMessageAddPayload) {
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

    private async logUserNoteAdd({
        infractionId,
        user,
        moderator,
        reason,
        guild
    }: LogUserNoteAddPayload) {
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
}

type SendLogOptions = {
    messageCreateOptions: MessageCreateOptions | MessagePayload;
    guildId: Snowflake;
    eventType?: LogEventType;
};

export default AuditLoggingService;
