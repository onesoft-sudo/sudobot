import { Message } from "discord.js";
import DiscordClient from "../client/Client";
import Service from "../utils/structures/Service";

export default class AutoResponder extends Service {
    async run(message: Message) {
        const config = this.client.config.props[message.guild!.id]?.autoresponder;

        if (!config?.enabled) {
            return;
        }

        let responseCount = 0;

        for (const token in config.tokens) {
            if (responseCount >= 3) {
                return;
            }

            if (message.content.includes(token)) {
                await message.reply({ content: config.tokens[token] });
                responseCount++;
            }
        }

        for (const word in config.words) {
            if (responseCount >= 3) {
                return;
            }
            
            if (this.client.commonService.words.includes(word)) {
                await message.reply({ content: config.words[word] });
                responseCount++;
            }
        }
    }
}