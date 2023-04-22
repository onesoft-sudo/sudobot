import { Message, Util } from "discord.js";
import MessageEmbed from "../client/MessageEmbed";
import Service from "../utils/structures/Service";
import { hasConfig } from "../utils/util";

export enum MessageRuleType {
    RESTRICT_WORDS_IN_ROW = 'ruleRestrictWordsInRow',
    REGEX_STRICT = 'ruleRegexStrict',
}

export enum MessageRuleAction {
    NO_ACTION = 'no_action',
    WARN = 'warn',
    DELETE = 'delete'
}

export interface MessageRule {
    type: MessageRuleType;
    action: MessageRuleAction;
    meta: any;
    disabledChannels?: string[];
    enabledChannels?: string[];
}

export default class MessageRules extends Service {
    async onMessageCreate(message: Message) {
        if (!hasConfig(this.client, message.guildId!, "message_rules"))
            return;
        
        const { message_rules: { enabled, disabled_channels, rules }, mod_role } = this.client.config.props[message.guildId!];

        if (!enabled || disabled_channels.includes(message.channelId!) || message.member?.roles.cache.has(mod_role)) {
            return;
        }

        for await (const rule of (rules as MessageRule[])) {
            console.log(rule.type);

            if (rule.type.startsWith('rule') && typeof this[rule.type] === 'function') {
                if (rule.disabledChannels && rule.disabledChannels.includes(message.channel.id!)) {
                    continue;
                }

                if (rule.enabledChannels && !rule.enabledChannels.includes(message.channel.id!)) {
                    continue;
                }

                if (!(await this[rule.type](message, rule))) {
                    return false;
                }
            }
        }

        return true;
    }

    async ruleRegexStrict(message: Message, rule: MessageRule) {
        const { patterns } = rule.meta as { patterns: string[] };

        for (const pattern of patterns) {
            if (!(new RegExp(pattern, 'gi').test(message.content))) {
                message.delete().catch(console.error);
                this.client.logger.loggingChannel(message.guildId!)?.send({
                    embeds: [
                        new MessageEmbed({
                            author: {
                                name: message.author.tag,
                                iconURL: message.author.displayAvatarURL()
                            },
                            color: 0xf14a60,
                            title: 'Regex Rule Does Not Match',
                            description: message.content,
                            fields: [
                                {
                                    name: 'Pattern',
                                    value: `\`${Util.escapeMarkdown(pattern)}\``
                                },
                                {
                                    name: 'User ID',
                                    value: message.author.id
                                },
                                {
                                    name: 'Channel',
                                    value: `<#${message.channel.id}> (${message.channel.id})`
                                }
                            ],
                            footer: { text: 'Deleted' }
                        })
                        .setTimestamp()
                    ]
                }).catch(console.error);

                return false;
            }
        }

        return true;
    }

    async restrictWordsInRowHandler(message: Message, rule: MessageRule) {
        console.log("Test");

        if (rule.action === MessageRuleAction.DELETE) {
            await message.delete();
        }
        else if (rule.action === MessageRuleAction.WARN) {
            // TODO
        }
    }

    async ruleRestrictWordsInRow(message: Message, rule: MessageRule) {
        const words = message.content.toLowerCase().split(/\s+/);

        for await (const token of (rule.meta?.tokens ?? [])) {
            const tokenWords = token.toLowerCase().split(/\s+/);

            let wordsInTokensCopy = [...tokenWords];

            for (const word of words) {
                console.log(word, wordsInTokensCopy.indexOf(word));
                const index = wordsInTokensCopy.indexOf(word);

                if (index !== -1) {
                    wordsInTokensCopy.splice(index, 1);
                    console.log(wordsInTokensCopy);
                }
                else if (wordsInTokensCopy.length === 0) {
                    await this.restrictWordsInRowHandler(message, rule);
                    return false;
                }
                else if (wordsInTokensCopy.length !== tokenWords.length) {
                    wordsInTokensCopy = [...tokenWords];
                }
            }
            
            if (wordsInTokensCopy.length === 0)
                await this.restrictWordsInRowHandler(message, rule);
        }

        return true;
    }
}