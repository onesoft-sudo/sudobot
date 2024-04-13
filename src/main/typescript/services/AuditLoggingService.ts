import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbed,
    EmbedBuilder,
    Guild,
    GuildMember,
    Message,
    MessageCreateOptions,
    MessagePayload,
    Snowflake,
    User,
    bold,
    inlineCode,
    italic,
    roleMention
} from "discord.js";
import { Inject } from "@framework/container/Inject";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { Colors } from "../constants/Colors";
import { RuleExecResult } from "../contracts/ModerationRuleHandlerContract";
import { MessageRuleType } from "../types/MessageRuleSchema";
import { ModerationAction } from "../types/ModerationAction";
import { safeChannelFetch } from "../utils/fetch";
import ConfigurationManager from "./ConfigurationManager";

@Name("auditLoggingService")
class AuditLoggingService extends Service {
    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    private configFor(guildId: Snowflake) {
        return this.configurationManager.config[guildId!]?.logging;
    }

    private shouldLog(guildId: Snowflake) {
        return this.configFor(guildId)?.enabled;
    }

    public async sendLog({ embed, guild, user, messageOptions }: LogOptions) {
        if (!this.shouldLog(guild.id)) {
            return;
        }

        const channelId = this.configFor(guild.id)?.primary_channel;

        if (!channelId) {
            return;
        }

        const channel =
            guild.channels.cache.get(channelId) ?? (await safeChannelFetch(guild, channelId));

        if (!channel?.isTextBased()) {
            return;
        }

        const builder = new EmbedBuilder({
            ...embed,
            author: user
                ? {
                      name: user instanceof GuildMember ? user.user.username : user.username,
                      icon_url:
                          user instanceof GuildMember
                              ? user.user.displayAvatarURL()
                              : user.displayAvatarURL()
                  }
                : embed.author
        });

        if (!embed.timestamp) {
            builder.setTimestamp();
        }

        if (!embed.color) {
            builder.setColor(Colors.Primary);
        }

        return channel.send({
            ...(messageOptions as MessageCreateOptions),
            embeds: [builder],
            allowedMentions: {
                parse: [],
                roles: [],
                users: []
            }
        });
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

    public ruleAttributes(rule: MessageRuleType) {
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

    public async logMessageRuleModeration(
        message: Message,
        rule: MessageRuleType,
        result: RuleExecResult
    ) {
        return this.sendLog({
            user: message.author,
            guild: message.guild!,
            embed: {
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
                title: "AutoMod Rule Action"
            }
        });
    }
}

type LogOptions = {
    guild: Guild;
    embed: APIEmbed;
    user?: User | GuildMember;
    messageOptions?: MessageCreateOptions | MessagePayload;
};

export default AuditLoggingService;
