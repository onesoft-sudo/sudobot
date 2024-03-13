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

import { Message, PermissionsBitField } from "discord.js";
import { logError } from "../components/io/Logger";
import Service from "../core/Service";
import { HasEventListeners } from "../types/HasEventListeners";
import { isImmuneToAutoMod } from "../utils/utils";

export const name = "messageFilter";

export default class MessageFilter extends Service implements HasEventListeners {
    protected readonly immunePermissions = [
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ManageMessages
    ];

    private config(guildId: string) {
        return this.client.configManager.config[guildId]?.message_filter;
    }

    onMessageCreate(message: Message) {
        return this.scanMessage(message);
    }

    async scanMessage(message: Message) {
        if (!message.content || message.content.trim() === "") return;

        const config = this.config(message.guildId!);

        if (!config?.enabled) return;

        if (await isImmuneToAutoMod(this.client, message.member!, this.immunePermissions)) {
            return;
        }

        const blockedWords = config?.data?.blocked_words ?? [];
        const blockedTokens = config?.data?.blocked_tokens ?? [];
        const blockedMessages = config?.data?.blocked_messages ?? [];

        const { safe: tokenSafe, token } = await this.filterTokens(message, blockedTokens);
        const { safe: wordSafe, word } = await this.filterWords(message, blockedWords);
        const { safe: messageSafe, theMessage } = await this.filterMessages(
            message,
            blockedMessages
        );

        if (
            (!tokenSafe || !wordSafe || !messageSafe) &&
            ((!tokenSafe &&
                (config.send_logs === true ||
                    (typeof config.send_logs === "object" && config.send_logs.blocked_tokens))) ||
                (!wordSafe &&
                    (config.send_logs === true ||
                        (typeof config.send_logs === "object" &&
                            config.send_logs.blocked_words))) ||
                (!messageSafe &&
                    (config.send_logs === true ||
                        (typeof config.send_logs === "object" &&
                            config.send_logs.blocked_messages))))
        ) {
            const blockType = !tokenSafe ? "token" : !wordSafe ? "word" : "message";
            this.client.loggerService
                .logBlockedWordOrToken({
                    guild: message.guild!,
                    content: message.content,
                    blockType: blockType,
                    user: message.author,
                    token: !tokenSafe ? token : undefined,
                    word: !wordSafe ? word : undefined,
                    message: !messageSafe ? theMessage : undefined
                })
                .catch(logError);
        }

        if (!message.deletable) return false;

        if (
            !tokenSafe &&
            (config.delete_message === true ||
                (typeof config.delete_message === "object" && config.delete_message.blocked_tokens))
        ) {
            message.delete().catch(logError);
            return true;
        }

        if (
            !wordSafe &&
            (config.delete_message === true ||
                (typeof config.delete_message === "object" && config.delete_message.blocked_words))
        ) {
            message.delete().catch(logError);
            return true;
        }

        if (
            !messageSafe &&
            (config.delete_message === true ||
                (typeof config.delete_message === "object" &&
                    config.delete_message.blocked_messages))
        ) {
            message.delete().catch(logError);
            return true;
        }

        return false;
    }

    async filterTokens(message: Message, blockedTokens: string[]) {
        for (const blockedToken of blockedTokens) {
            if (message.content.toLowerCase().includes(blockedToken.toLowerCase())) {
                return { safe: false, token: blockedToken };
            }
        }

        return { safe: true };
    }

    async filterWords(message: Message, blockedWords: string[]) {
        const words = message.content.toLowerCase().split(/ +/);

        for (const blockedWord of blockedWords) {
            if (words.includes(blockedWord.toLowerCase())) {
                return { safe: false, word: blockedWord };
            }
        }

        return { safe: true };
    }

    async filterMessages(message: Message, blockedMessages: string[]) {
        const content = message.content.toLowerCase();

        for (const blockedMessage of blockedMessages) {
            if (content === blockedMessage.toLowerCase()) {
                return { safe: false, theMessage: blockedMessage };
            }
        }

        return { safe: true };
    }
}
