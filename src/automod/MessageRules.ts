import { Message } from "discord.js";
import Service from "../utils/structures/Service";

export enum MessageRuleType {
    RESTRICT_WORDS_IN_ROW = 'ruleRestrictWordsInRow',
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
}

export default class MessageRules extends Service {
    async onMessageCreate(message: Message) {
        const { message_rules: { enabled, disabled_channels, rules }, mod_role } = this.client.config.props[message.guildId!];

        if (!enabled || disabled_channels.includes(message.channelId!) || message.member?.roles.cache.has(mod_role)) {
            return;
        }

        for await (const rule of (rules as MessageRule[])) {
            if (rule.type.startsWith('rule') && typeof this[rule.type] === 'function') {
                if (!(await this[rule.type](message, rule))) {
                    return false;
                }
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