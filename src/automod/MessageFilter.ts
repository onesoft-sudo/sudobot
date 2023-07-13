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
import Service from "../core/Service";

export const name = "messageFilter";

export default class MessageFilter extends Service {
    protected readonly immunePermissions = [
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ManageMessages,
    ];

    private config(guildId: string) {
        return this.client.configManager.config[guildId]?.message_filter;
    }

    async onMessageCreate(message: Message) {
        if (!message.content || message.content.trim() === '')
            return;

        const config = this.config(message.guildId!);

        if (!config?.enabled)
            return;

        const permission = message.member?.permissions.has(this.immunePermissions, true);

        if (permission)
            return;

        const blockedWords = config?.data?.blocked_words ?? [];
        const blockedTokens = config?.data?.blocked_tokens ?? [];

        const { safe: tokenSafe, token } = await this.filterTokens(message, blockedTokens);
        const { safe: wordSafe, word } = await this.filterWords(message, blockedWords);

        if (
            (!tokenSafe || !wordSafe) && (
                (!tokenSafe && (config.send_logs === true || (typeof config.send_logs === 'object' && config.send_logs.blocked_tokens))) ||
                (!wordSafe && (config.send_logs === true || (typeof config.send_logs === 'object' && config.send_logs.blocked_words)))
            )
        ) {
            this.client.logger.logBlockedWordOrToken({
                guild: message.guild!,
                content: message.content,
                isToken: !tokenSafe,
                user: message.author,
                token: !tokenSafe ? token : undefined,
                word: !wordSafe ? word : undefined,
            }).catch(console.error);
        }

        if (!message.deletable)
            return false;

        if (!tokenSafe && (config.delete_message === true || (typeof config.delete_message === 'object' && config.delete_message.blocked_tokens))) {
            message.delete().catch(console.error);
            return true;
        }

        if (!wordSafe && (config.delete_message === true || (typeof config.delete_message === 'object' && config.delete_message.blocked_words))) {
            message.delete().catch(console.error);
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
}