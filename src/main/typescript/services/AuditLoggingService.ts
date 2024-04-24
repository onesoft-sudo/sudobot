import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { channelInfo, messageInfo, userInfo } from "@framework/utils/embeds";
import { fetchChannel } from "@framework/utils/entities";
import { isDiscordAPIError } from "@framework/utils/errors";
import { Colors } from "@main/constants/Colors";
import { RuleExecResult } from "@main/contracts/ModerationRuleHandlerContract";
import ConfigurationManager from "@main/services/ConfigurationManager";
import { GuildConfig } from "@main/types/GuildConfigSchema";
import { MessageRuleType } from "@main/types/MessageRuleSchema";
import { ModerationAction } from "@main/types/ModerationAction";
import { chunkedString } from "@main/utils/utils";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection,
    Message,
    MessageCreateOptions,
    MessagePayload,
    Snowflake,
    TextChannel,
    User,
    Webhook,
    bold,
    inlineCode,
    italic,
    roleMention
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

export enum LogEventType {
    MessageDelete = "message_delete",
    MessageUpdate = "message_update",
    SystemAutoModRuleModeration = "system_automod_rule_moderation"
}

type LogEventArgs = {
    [LogEventType.MessageDelete]: [message: Message<true>, moderator?: User];
    [LogEventType.MessageUpdate]: [oldMessage: Message<true>, newMessage: Message<true>];
    [LogEventType.SystemAutoModRuleModeration]: [
        message: Message,
        rule: MessageRuleType,
        result: RuleExecResult
    ];
};

@Name("auditLoggingService")
class AuditLoggingService extends Service {
    private readonly webhooks = new Collection<`${Snowflake}::${Snowflake}`, WebhookInfo>();
    private readonly logHandlers: Record<
        LogEventType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (...args: any[]) => Promise<Message | undefined>
    > = {
        [LogEventType.MessageDelete]: this.logMessageDelete,
        [LogEventType.MessageUpdate]: this.logMessageUpdate,
        [LogEventType.SystemAutoModRuleModeration]: this.logMessageRuleModeration
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

    private async send({
        guildId,
        messageCreateOptions,
        channelType = "primary"
    }: SendLogOptions): Promise<Message | undefined> {
        const guild = this.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const configManager = this.application.getServiceByName("configManager");
        const config = configManager.config[guildId]?.logging;

        if (!config?.enabled) {
            return;
        }

        const channelId = config?.channels?.[channelType] ?? config?.channels?.primary;

        if (!channelId) {
            this.application.logger.warn(
                `No logging channel found for guild ${guild.name} (${guild.id})`
            );
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
        const configManager = this.application.getServiceByName("configManager");
        const config = configManager.config[guildId]?.logging;

        if (!config?.enabled || config.events?.[type] === false) {
            return;
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
            }
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
            }
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
            }
        });
    }
}

type SendLogOptions = {
    messageCreateOptions: MessageCreateOptions | MessagePayload;
    guildId: Snowflake;
    channelType?: keyof NonNullable<NonNullable<GuildConfig["logging"]>["channels"]>;
};

export default AuditLoggingService;
