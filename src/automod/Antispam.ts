import { Message, TextChannel } from "discord.js";
import Service from "../core/Service";
import { getEmoji, isTextableChannel } from "../utils/utils";

interface SpamUserInfo {
    timestamps: number[];
    timeout?: NodeJS.Timeout;
    messages: string[];
}

export const name = "antispam";

export default class Antispam extends Service {
    protected readonly map: Record<string, Record<string, SpamUserInfo | undefined>> = {};

    boot() {
        for (const guild in this.client.configManager.config) {
            this.map[guild] = {};
        }
    }

    async onMessageCreate(message: Message) {
        if (!isTextableChannel(message.channel)) return;

        const config = this.client.configManager.config[message.guildId!];

        if (
            !config?.antispam?.enabled ||
            !config?.antispam.limit ||
            !config?.antispam.timeframe ||
            config.antispam.limit < 1 ||
            config.antispam.timeframe < 1
        ) {
            return;
        }

        const info = this.map[message.guildId!][message.author.id] ?? ({} as SpamUserInfo);

        info.timestamps ??= [];
        info.messages ??= [];
        info.timestamps.push(Date.now());
        info.messages.push(message.id);

        if (!info.timeout) {
            info.timeout = setTimeout(() => {
                const delayedInfo = this.map[message.guildId!][message.author.id] ?? ({} as SpamUserInfo);
                const timestamps = delayedInfo.timestamps.filter((timestamp) => config.antispam?.timeframe! + timestamp >= Date.now());

                if (timestamps.length >= config.antispam?.limit!) {
                    (message.channel as TextChannel)
                        .bulkDelete(delayedInfo.messages, false)
                        .then(() => {
                            message.channel
                                .send(
                                    `${getEmoji(this.client, "check")} Deleted ${delayedInfo.messages.length} messages from user ${
                                        message.author.tag
                                    }`
                                )
                                .then((msg) => setTimeout(() => msg.delete().catch(console.error), 5000))
                                .catch(console.error);
                        })
                        .catch(console.error);
                }

                this.map[message.guildId!][message.author.id] = undefined;
            }, config.antispam.timeframe);
        }

        this.map[message.guildId!][message.author.id] = info;
    }
}
