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

import { Guild, GuildMember } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { GuildConfig } from "../types/GuildConfigSchema";
import { HasEventListeners } from "../types/HasEventListeners";
import { logError } from "../utils/logger";

export const name = "antiraid";

export default class Antiraid extends Service implements HasEventListeners {
    map: Map<string, { count: number; locked: boolean; timer?: NodeJS.Timeout }> = new Map();

    @GatewayEventListener("ready")
    async onReady() {
        for (const [id] of this.client.guilds.cache) this.map.set(id, { count: 0, locked: false });
    }

    @GatewayEventListener("guildMemberAdd")
    async onGuildMemberAdd(member: GuildMember) {
        if (member.user.bot) {
            return;
        }

        const config = this.client.configManager.config[member.guild.id]?.antiraid;

        if (!config?.enabled || !config.max_joins || !config.timeframe || config.timeframe < 6000) {
            return;
        }

        const info = this.map.get(member.guild.id) ?? { count: 0, locked: false };
        const { count, locked } = info;

        if (!locked && count > config.max_joins) {
            if (config.send_log)
                this.client.logger.logRaid({
                    guild: member.guild,
                    action:
                        config.action === "lock"
                            ? "Locked the server"
                            : config.action === "antijoin"
                            ? "Turned on anti join system"
                            : config.action === "lock_and_antijoin"
                            ? "Locked the server and turned on anti join system"
                            : "Automatic"
                });

            this.map.set(member.guild.id, { count: count + 1, locked: true });

            if (config.action === "lock_and_antijoin") {
                await this.lock(member.guild, config);
                this.antijoin(member.guild);
            } else if (config.action === "antijoin" || config.action === "auto") {
                this.antijoin(member.guild);
            } else if (config.action === "lock") {
                await this.lock(member.guild, config);
            }
        } else if (!locked) {
            this.map.set(member.guild.id, { count: count + 1, locked });
        }

        if (!info.timer) {
            info.timer = setTimeout(() => {
                info.count = 0;
                this.map.set(member.guild.id, info);
                info.timer = undefined;
            }, config.timeframe);
        }
    }

    lock(guild: Guild, config: Exclude<GuildConfig["antiraid"], undefined>) {
        return this.client.channelLockManager
            .lockGuild(guild, {
                moderator: this.client.user!,
                channelMode: config.channel_mode,
                channels: config.channels,
                ignorePrivateChannels: config.ignore_private_channels,
                reason: "Possible raid detected"
            })
            .catch(logError);
    }

    antijoin(guild: Guild) {
        return this.client.antijoin.enable(guild);
    }
}
