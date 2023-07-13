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

import { GuildMember, Message, TextChannel } from "discord.js";
import Service from "../core/Service";
import { isTextableChannel } from "../utils/utils";

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

        console.log("Pushed");

        if (!info.timeout) {
            console.log("Timeout set");

            info.timeout = setTimeout(() => {
                const delayedInfo = this.map[message.guildId!][message.author.id] ?? ({} as SpamUserInfo);
                const timestamps = delayedInfo.timestamps.filter((timestamp) => config.antispam?.timeframe! + timestamp >= Date.now());

                if (timestamps.length >= config.antispam?.limit!) {
                    this.client.infractionManager
                        .createMemberMute(message.member as GuildMember, {
                            guild: message.guild!,
                            moderator: this.client.user!,
                            bulkDeleteReason: "The system has detected spam messages from this user",
                            duration:
                                config.antispam?.mute_duration && config.antispam?.mute_duration > 0
                                    ? config.antispam?.mute_duration
                                    : 1000 * 60 * 60,
                            messageChannel: message.channel! as TextChannel,
                            messagesToDelete: info.messages,
                            notifyUser: true,
                            reason: "Spam detected",
                            sendLog: true
                        })
                        .catch(console.error);

                    console.log("Triggered");
                }

                this.map[message.guildId!][message.author.id] = undefined;
                console.log("Popped");
            }, config.antispam.timeframe);
        }

        this.map[message.guildId!][message.author.id] = info;
    }
}
