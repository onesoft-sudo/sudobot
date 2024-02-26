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

import { ActivityType, GuildMember, PartialGuildMember, PermissionFlagsBits } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { GuildConfig } from "../types/GuildConfigSchema";
import { HasEventListeners } from "../types/HasEventListeners";
import { log } from "../utils/Logger";
import { isImmuneToAutoMod } from "../utils/utils";

export const name = "profileFilter";

export default class ProfileFilter extends Service implements HasEventListeners {
    @GatewayEventListener("guildMemberUpdate")
    async onGuildMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        if (newMember.user.bot) return;
        const oldStatus = oldMember.presence?.activities.find(a => a.type === ActivityType.Custom);
        const newStatus = newMember.presence?.activities.find(a => a.type === ActivityType.Custom);

        if (
            oldMember.nickname === newMember.nickname &&
            oldMember.user.username === newMember.user.username &&
            oldStatus === newStatus
        ) {
            return;
        }

        if (await isImmuneToAutoMod(this.client, newMember, [PermissionFlagsBits.ManageGuild])) {
            return;
        }

        const config = this.client.configManager.config[newMember.guild.id]?.profile_filter;
        const messageFilterConfig = this.client.configManager.config[newMember.guild.id]?.message_filter;

        if (!config?.enabled) return;

        if (config.scan.length > 0) {
            const words = config.words ?? [];
            const tokens = config.tokens ?? [];

            if (
                config.inherit_from_message_filter?.tokens &&
                messageFilterConfig?.enabled &&
                messageFilterConfig?.data?.blocked_tokens
            ) {
                tokens.push(...messageFilterConfig?.data?.blocked_tokens);
            }

            if (
                config.inherit_from_message_filter?.words &&
                messageFilterConfig?.enabled &&
                messageFilterConfig?.data?.blocked_words
            ) {
                words.push(...messageFilterConfig?.data?.blocked_words);
            }

            if (
                config.scan.includes("nickname") &&
                config.actions?.nickname &&
                config.actions?.nickname !== "none" &&
                newMember.nickname
            ) {
                const token = this.findToken(tokens, newMember.nickname);

                if (token) {
                    await this.takeAction(newMember, config.actions.nickname!, "nickname");
                    return;
                }

                const word = this.findWord(words, newMember.nickname);

                if (word) {
                    await this.takeAction(newMember, config.actions.nickname!, "nickname");
                    return;
                }
            }

            if (config.scan.includes("status") && config.actions?.status && config.actions?.status !== "none" && newStatus) {
                const token = this.findToken(tokens, `${newStatus.name} ${newStatus.details}`);

                if (token) {
                    await this.takeAction(newMember, config.actions.nickname!, "status");
                    return;
                }

                const word = this.findWord(words, `${newStatus.name} ${newStatus.details}`);

                if (word) {
                    await this.takeAction(newMember, config.actions.nickname!, "status");
                    return;
                }
            }

            if (
                config.scan.includes("username") &&
                config.actions?.username &&
                config.actions?.username !== "none" &&
                newMember.user.username
            ) {
                const token = this.findToken(tokens, newMember.user.username);

                if (token) {
                    await this.takeAction(newMember, config.actions.username!, "username");
                    return;
                }

                const word = this.findWord(words, newMember.user.username);

                if (word) {
                    await this.takeAction(newMember, config.actions.username!, "username");
                    return;
                }
            }
        }
    }

    findToken(tokens: string[], targetString: string) {
        for (const token of tokens) {
            if (targetString.toLowerCase().includes(token.toLowerCase())) {
                return token;
            }
        }

        return null;
    }

    findWord(words: string[], targetString: string) {
        const targetWords = targetString.toLowerCase().split(/\s+/);

        for (const targetWord of targetWords) {
            if (words.includes(targetWord)) {
                return targetWord;
            }
        }

        return null;
    }

    async takeAction(member: GuildMember, action: Actions[keyof Actions], entity: keyof Actions) {
        if (action === "mute")
            await this.client.infractionManager.createMemberMute(member, {
                guild: member.guild,
                moderator: this.client.user!,
                autoRemoveQueue: true,
                notifyUser: true,
                sendLog: true,
                reason: `Your ${entity} contains a blocked word/token. Please remove it and you'll be unmuted automatically.`
            });
        else if (action === "warn")
            await this.client.infractionManager.createMemberWarn(member, {
                guild: member.guild,
                moderator: this.client.user!,
                notifyUser: true,
                sendLog: true,
                reason: `Your ${entity} contains a blocked word/token. Please remove it, or we may take further actions.`
            });
        else log("No action was taken");
    }
}

type Actions = Exclude<Exclude<GuildConfig["profile_filter"], undefined>["actions"], undefined>;
