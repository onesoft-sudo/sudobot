/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

// TODO: Add an allow/disallow mode to all roles

import {
    Message,
    PermissionFlagsBits,
    Snowflake,
    TextChannel,
    escapeCodeBlock,
    escapeInlineCode,
    escapeMarkdown
} from "discord.js";
import Service from "../core/Service";
import { CreateLogEmbedOptions } from "../services/LoggerService";
import { HasEventListeners } from "../types/HasEventListeners";
import { MessageRuleType } from "../types/MessageRuleSchema";
import { log, logError, logWarn } from "../utils/logger";
import { escapeRegex, getEmoji } from "../utils/utils";

export const name = "messageRuleService";

type RuleHandlerMethod = Extract<keyof MessageRuleService, `rule${string}`>;

type RuleInfo =
    | RuleHandlerMethod
    | {
          method: RuleHandlerMethod;
          autoHandleModes?: boolean;
      };

const handlers: Record<MessageRuleType["type"], RuleInfo> = {
    domain: {
        method: "ruleDomain",
        autoHandleModes: false
    },
    blocked_file_extension: "ruleBlockedFileExtension",
    blocked_mime_type: "ruleBlockedMimeType",
    anti_invite: "ruleAntiInvite",
    regex_filter: "ruleRegexFilter",
    block_repeated_text: "ruleRepeatedText",
    block_mass_mention: "ruleBlockMassMention",
    regex_must_match: "ruleRegexMustMatch",
    image: "ruleImage"
};

type MessageRuleAction = MessageRuleType["actions"][number];

export default class MessageRuleService extends Service implements HasEventListeners {
    private config(guildId: Snowflake) {
        return this.client.configManager.config[guildId]?.message_rules;
    }

    async onMessageCreate(message: Message<boolean>) {
        if (message.author.bot) {
            return false;
        }

        const config = this.config(message.guildId!);

        if (
            !config?.enabled ||
            config?.global_disabled_channels?.includes(message.channelId!) ||
            (await this.client.permissionManager.isImmuneToAutoMod(message.member!, PermissionFlagsBits.ManageGuild))
        ) {
            return false;
        }

        return this.processMessageRules(message, config.rules);
    }

    private async processMessageRules(message: Message, rules: Array<MessageRuleType>) {
        for (const rule of rules) {
            if (rule.actions.length === 0) {
                log("No action found in this rule! Considering it as disabled.");
                continue;
            }

            if (rule.actions.length === 1 && rule.actions.includes("delete") && !message.deletable) {
                log("Missing permissions to delete messages, but the rule actions include `delete`. Skipping.");
                continue;
            }

            if (rule.actions.includes("mute") && rule.actions.includes("warn")) {
                logWarn("You cannot include mute and warn together as message rule actions! Skipping.");
                continue;
            }

            if (rule.disabled_channels.includes(message.channelId!)) {
                logWarn("This rule is disabled in this channel.");
                continue;
            }

            if (rule.immune_users.includes(message.author.id)) {
                logWarn("This user is immune to this rule.");
                continue;
            }

            if (message.member?.roles.cache.hasAny(...rule.immune_roles)) {
                logWarn("This user is immune to this rule, due to having some whitelisted roles.");
                continue;
            }

            const handlerFunctionInfo = handlers[rule.type];
            const handlerFunctionName: RuleHandlerMethod | undefined =
                typeof handlerFunctionInfo === "string" ? handlerFunctionInfo : handlerFunctionInfo?.method;
            const handlerFunctionMetaInfo = (typeof handlerFunctionInfo === "string" ? null : handlerFunctionInfo) ?? {
                method: handlerFunctionName,
                autoHandleModes: true
            };

            if (!handlerFunctionInfo || !handlerFunctionName?.startsWith("rule")) {
                continue;
            }

            const handler = this[handlerFunctionName] as (
                ...args: any[]
            ) => Promise<boolean | null | undefined | CreateLogEmbedOptions>;

            if (typeof handler !== "function") {
                continue;
            }

            try {
                const result = await handler.call(this, message, rule);
                const inverse = rule.mode === "inverse";
                const { autoHandleModes } = handlerFunctionMetaInfo;

                if ((result && !inverse) || (inverse && ((autoHandleModes && !result) || (!autoHandleModes && result)))) {
                    try {
                        for (const action of rule.actions) {
                            log("Taking action: ", action);
                            await this.takeAction(message, rule, action);
                        }

                        const embedOptions =
                            result && typeof result === "object" && !inverse
                                ? result
                                : inverse
                                ? {
                                      options: {
                                          description: `${getEmoji(this.client, "info")} This rule was __inversed__.`,
                                          ...(result && typeof result === "object" && "options" in result ? result.options : {})
                                      },
                                      ...(result && typeof result === "object" ? result : {})
                                  }
                                : undefined;

                        log(embedOptions);

                        await this.client.logger
                            .logMessageRuleAction({
                                message,
                                actions: rule.actions,
                                rule: rule.type,
                                embedOptions
                            })
                            .catch(logError);
                    } catch (e) {
                        logError(e);
                    }

                    return true;
                }
            } catch (e) {
                logError(e);
                continue;
            }
        }

        return false;
    }

    private getReason(rule: MessageRuleType, key: Extract<keyof MessageRuleType, `${string}_reason`>) {
        return rule[key] ?? rule.common_reason ?? "Your message violated the server rules. Please be careful next time.";
    }

    private async takeAction(message: Message, rule: MessageRuleType, action: MessageRuleAction) {
        switch (action) {
            case "delete":
                if (message.deletable) {
                    await message.delete().catch(logError);
                }

                break;

            case "verbal_warn":
                {
                    const content = this.getReason(rule, "verbal_warning_reason");

                    await message.reply({
                        content
                    });
                }

                break;

            case "warn":
                {
                    const reason = this.getReason(rule, "warning_reason");

                    await this.client.infractionManager.createMemberWarn(message.member!, {
                        guild: message.guild!,
                        moderator: this.client.user!,
                        notifyUser: true,
                        reason,
                        sendLog: true
                    });
                }

                break;

            case "mute":
                {
                    const reason = this.getReason(rule, "mute_reason");

                    await this.client.infractionManager.createMemberMute(message.member!, {
                        guild: message.guild!,
                        moderator: this.client.user!,
                        notifyUser: true,
                        reason,
                        sendLog: true,
                        autoRemoveQueue: true,
                        duration: rule.mute_duration === -1 ? 60_000 : rule.mute_duration
                    });
                }

                break;

            case "clear":
                {
                    await this.client.infractionManager.bulkDeleteMessages({
                        guild: message.guild!,
                        moderator: this.client.user!,
                        count: 50,
                        sendLog: true,
                        messageChannel: message.channel! as TextChannel,
                        user: message.member!.user,
                        reason: "Message rule triggered"
                    });
                }

                break;
        }
    }

    async ruleImage(message: Message, rule: Extract<MessageRuleType, { type: "image" }>) {
        log("here");

        if (message.attachments.size === 0) {
            return null;
        }

        const config = this.client.configManager.config[message.guildId!]?.message_filter;
        const { mode, tokens, words, inherit_from_word_filter } = rule;

        if (config?.enabled && inherit_from_word_filter) {
            words.push(...config.data.blocked_words);
            tokens.push(...config.data.blocked_tokens);
        }

        for (const attachment of message.attachments.values()) {
            if (!attachment.contentType?.startsWith("image/")) {
                log(`Not scanning attachment ${attachment.id} as it's not an image`);
                continue;
            }

            const {
                data: { text: actualText, words: textWords }
            } = await this.client.imageRecognitionService.recognize(attachment.proxyURL);
            const text = actualText.toLowerCase();

            for (const token of tokens) {
                const includes = text.includes(token.toLowerCase());

                if (includes && mode === "normal") {
                    return {
                        title: "Blocked token(s) detected in image",
                        fields: [
                            {
                                name: "Token",
                                value: `||${escapeMarkdown(token)}||`
                            },
                            {
                                name: "Method",
                                value: "Image Scan"
                            }
                        ]
                    } satisfies CreateLogEmbedOptions;
                } else if (!includes && mode === "inverse") {
                    return {
                        title: "Required token(s) were not found in image",
                        fields: [
                            {
                                name: "Token",
                                value: `||${escapeMarkdown(token)}||`
                            },
                            {
                                name: "Method",
                                value: "Image Scan"
                            }
                        ]
                    } satisfies CreateLogEmbedOptions;
                }
            }

            for (const textWord of textWords) {
                const includes = words.includes(textWord.text.toLowerCase());

                if (includes && mode === "normal") {
                    return {
                        title: "Blocked word(s) detected in image",
                        fields: [
                            {
                                name: "Word",
                                value: `||${escapeMarkdown(textWord.text)}||`
                            },
                            {
                                name: "Method",
                                value: "Image Scan"
                            }
                        ]
                    } satisfies CreateLogEmbedOptions;
                } else if (!includes && mode === "inverse") {
                    return {
                        title: "Required word(s) were not found in image",
                        fields: [
                            {
                                name: "Word",
                                value: `||${escapeMarkdown(textWord.text)}||`
                            },
                            {
                                name: "Method",
                                value: "Image Scan"
                            }
                        ]
                    } satisfies CreateLogEmbedOptions;
                }
            }
        }

        log("Image scan passed");
        return null;
    }

    async ruleDomain(message: Message, rule: Extract<MessageRuleType, { type: "domain" }>) {
        if (message.content.trim() === "") {
            return null;
        }

        const { domains, scan_links_only, mode } = rule;

        const prefix = scan_links_only ? `(https?://)` : `(https?://)?`;
        let specificRegex = `${prefix}(`;
        const genericRegex = `${prefix}([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})`;

        let index = 0;
        for (const domain of domains) {
            const escapedDomain = escapeRegex(domain).replace(/\\\*/g, "[A-Za-z0-9-]+");
            specificRegex += `${escapedDomain}`;

            if (index < domains.length - 1) {
                specificRegex += "|";
            }

            index++;
        }

        specificRegex += ")\\S*";
        log(specificRegex);

        const specificMatches = [...(new RegExp(specificRegex, "i").exec(message.content) ?? [])];
        log(specificMatches);

        const genericMatches = [...(new RegExp(genericRegex, "i").exec(message.content) ?? [])];
        log(genericMatches);

        if (specificMatches.length > 0) {
            const cleanedDomain = (specificMatches[2] ?? specificMatches[1] ?? specificMatches[0]).replace(/https?:\/\//, "");
            if (mode === "normal") {
                return {
                    title: "Blocked domain(s) detected",
                    fields: [
                        {
                            name: "Domain",
                            value: `\`${escapeMarkdown(cleanedDomain)}\``
                        }
                    ]
                } satisfies CreateLogEmbedOptions;
            } else if (mode === "inverse") {
                return false;
            }
        } else if (genericMatches.length > 0 && mode === "inverse" && !scan_links_only) {
            const cleanedDomain = (genericMatches[2] ?? genericMatches[1] ?? genericMatches[0]).replace(/https?:\/\//, "");
            return {
                title: "Blocked domain(s) detected",
                fields: [
                    {
                        name: "Domain",
                        value: `\`${escapeMarkdown(cleanedDomain)}\``
                    }
                ]
            } satisfies CreateLogEmbedOptions;
        }

        return false;
    }

    async ruleBlockedFileExtension(message: Message, rule: Extract<MessageRuleType, { type: "blocked_file_extension" }>) {
        for (const attachment of message.attachments.values()) {
            for (const extension of rule.data) {
                if (attachment.proxyURL.endsWith(`.${extension}`)) {
                    return {
                        title: "File(s) with blocked extensions found",
                        fields: [
                            {
                                name: "File",
                                value: `[${attachment.name}](${attachment.url}): \`.${escapeMarkdown(extension)}\``
                            }
                        ]
                    };
                }
            }
        }

        return null;
    }

    async ruleBlockedMimeType(message: Message, rule: Extract<MessageRuleType, { type: "blocked_mime_type" }>) {
        for (const attachment of message.attachments.values()) {
            if (rule.data.includes(attachment.contentType ?? "unknown")) {
                return {
                    title: "File(s) with blocked MIME-type found",
                    fields: [
                        {
                            name: "File",
                            value: `[${attachment.name}](${attachment.url}): \`${attachment.contentType}\``
                        }
                    ]
                };
            }
        }

        return null;
    }

    async ruleAntiInvite(message: Message, rule: Extract<MessageRuleType, { type: "anti_invite" }>) {
        if (message.content.trim() === "") {
            return null;
        }

        const allowedInviteCodes = rule.allowed_invite_codes;
        const regex = /(https?:\/\/)?discord.(gg|com\/invite)\/([A-Za-z0-9_]+)/gi;
        const matches = message.content.matchAll(regex);

        for (const match of matches) {
            if (match[3] && !allowedInviteCodes.includes(match[3])) {
                if (rule.allow_internal_invites && this.client.inviteTracker.invites.has(`${message.guildId!}_${match[3]}`)) {
                    continue;
                }

                return {
                    title: "Posted Invite(s)",
                    fields: [
                        {
                            name: "Invite URL",
                            value: `\`https://discord.gg/${match[3]}\``
                        }
                    ]
                };
            }
        }

        return null;
    }

    async ruleRegexMustMatch(message: Message, rule: Extract<MessageRuleType, { type: "regex_must_match" }>) {
        if (message.content.trim() === "") {
            return null;
        }

        const { patterns } = rule;

        for (const pattern of patterns) {
            const regex = new RegExp(
                typeof pattern === "string" ? pattern : pattern[0],
                typeof pattern === "string" ? "gi" : pattern[1]
            );

            if (regex.test(message.content)) {
                return null;
            }
        }

        return {
            title: "Message did not match with the specified regex patterns"
        };
    }

    async ruleRegexFilter(message: Message, rule: Extract<MessageRuleType, { type: "regex_filter" }>) {
        if (message.content.trim() === "") {
            return null;
        }

        const { patterns } = rule;

        for (const pattern of patterns) {
            const regex = new RegExp(
                typeof pattern === "string" ? pattern : pattern[0],
                typeof pattern === "string" ? "gi" : pattern[1]
            );

            if (regex.test(message.content)) {
                return {
                    title: "Message matched with a blocked regex pattern",
                    fields: [
                        {
                            name: "Pattern Info",
                            value: `Pattern: \`${escapeInlineCode(
                                escapeCodeBlock(typeof pattern === "string" ? pattern : pattern[0])
                            )}\`\nFlags: \`${escapeInlineCode(
                                escapeCodeBlock(typeof pattern === "string" ? "gi" : pattern[1])
                            )}\``
                        }
                    ]
                };
            }
        }

        return null;
    }

    async ruleRepeatedText(message: Message, rule: Extract<MessageRuleType, { type: "block_repeated_text" }>) {
        if (message.content.trim() === "") {
            return null;
        }

        if (new RegExp("(.+)\\1{" + rule.max_repeated_chars + ",}", "gm").test(message.content)) {
            return {
                title: "Repeated text detected",
                fields: [
                    {
                        name: "Description",
                        value: `Too many repetitive characters were found`
                    }
                ]
            };
        } else if (new RegExp("^(.+)(?: +\\1){" + rule.max_repeated_words + "}", "gm").test(message.content)) {
            return {
                title: "Repeated text detected",
                fields: [
                    {
                        name: "Description",
                        value: `Too many repetitive words were found`
                    }
                ]
            };
        }

        return null;
    }

    async ruleBlockMassMention(message: Message, rule: Extract<MessageRuleType, { type: "block_mass_mention" }>) {
        if (message.content.trim() === "") {
            return null;
        }

        let data = [...message.content.matchAll(new RegExp(`\<\@[0-9]+\>`, "gm"))];

        console.log("users", data);

        if (data.length >= rule.max_mentions || (rule.max_user_mentions > 0 && data.length >= rule.max_user_mentions)) {
            return {
                title: "Mass mentions detected",
                fields: [
                    {
                        name: "Description",
                        value: `Too many users were mentioned`
                    }
                ]
            };
        }

        data = [...message.content.matchAll(new RegExp(`\<\@\&[0-9]+\>`, "gm"))];

        if (data.length >= rule.max_mentions || (rule.max_role_mentions > 0 && data.length >= rule.max_role_mentions)) {
            return {
                title: "Repeated text detected",
                fields: [
                    {
                        name: "Description",
                        value: `Too many roles were mentioned`
                    }
                ]
            };
        }

        return null;
    }
}
