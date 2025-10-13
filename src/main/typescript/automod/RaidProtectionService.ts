/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { assertUnreachable } from "@main/utils/utils";
import { GuildConfig } from "@schemas/GuildConfigSchema";
import { LogEventType } from "@schemas/LoggingSchema";
import { Collection, Guild, GuildMember, Snowflake } from "discord.js";

@Name("raidProtectionService")
class RaidProtectionService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    private readonly cache = new Collection<
        Snowflake,
        {
            count: number;
            lastUpdate: number;
            actionTaken: boolean;
        }
    >();

    private _timeout?: ReturnType<typeof setTimeout>;

    @GatewayEventListener("guildMemberAdd")
    public async onGuildMemberAdd(member: GuildMember) {
        const config = this.configManager.config[member.guild.id]?.raid_protection;

        if (!config?.enabled) {
            return;
        }

        const now = Date.now();
        const entry = this.cache.get(member.guild.id);

        this._timeout ??= setTimeout(() => {
            for (const [guildId, entry] of this.cache) {
                const config = this.configManager.config[guildId]?.raid_protection;

                if (!config?.enabled || entry.lastUpdate + config.timeframe < now) {
                    this.cache.delete(guildId);
                }
            }

            this._timeout = undefined;
        }, 60_000);

        if (!entry) {
            this.cache.set(member.guild.id, {
                count: 1,
                lastUpdate: now,
                actionTaken: false
            });

            return;
        }

        if (entry.actionTaken) {
            return;
        }

        if (entry.lastUpdate + config.timeframe < now) {
            entry.count = 1;
            entry.lastUpdate = now;
            return;
        }

        const { lastUpdate } = entry;

        entry.count++;
        entry.lastUpdate = now;

        if (entry.count <= config.threshold) {
            return;
        }

        await Promise.all([
            this.takeAction(member.guild, config, entry.count, now - lastUpdate),
            this.takeMemberAction(member, config)
        ]);

        entry.actionTaken = true;
    }

    private async takeAction(guild: Guild, config: RaidProtectionConfig, count: number, duration: number) {
        const action =
            config.action === "auto"
                ? duration < 60_000 && count >= 15
                    ? "lock_and_antijoin"
                    : "lock"
                : config.action;

        if (!this.configManager.config[guild.id]) {
            return;
        }

        switch (action) {
            case "antijoin":
                await this.enableAntiJoin(guild);
                break;
            case "lock":
                await this.lockGuild(guild, config);
                break;
            case "lock_and_antijoin":
                await this.lockGuild(guild, config);
                await this.enableAntiJoin(guild);
                break;
            case "none":
                break;
            default:
                assertUnreachable(action);
        }

        await this.application.service("auditLoggingService").emitLogEvent(guild.id, LogEventType.RaidAlert, {
            actions: config.member_actions,
            duration,
            guild,
            membersJoined: count,
            serverAction: action
        });
    }

    private async enableAntiJoin(guild: Guild) {
        this.configManager.config[guild.id]!.anti_member_join ??= {
            enabled: true,
            behavior: "kick",
            custom_reason: "Automatic: This server is not accepting new members at the moment.",
            ignore_bots: true
        };

        await this.configManager.write({ guild: true, system: false });
    }

    private async lockGuild(guild: Guild, { channel_mode, channels }: RaidProtectionConfig) {
        const channelsToLock = guild.channels.cache.filter(
            channel_mode === "exclude"
                ? channel => !channels.includes(channel.id)
                : channel => channels.includes(channel.id)
        );

        return await this.application.service("channelLockManager").lockAll(guild, channelsToLock.values());
    }

    private async takeMemberAction(member: GuildMember, config: RaidProtectionConfig) {
        if (config.member_actions.length === 0) {
            return;
        }

        await this.application
            .service("moderationActionService")
            .takeActions(member.guild, member, config.member_actions);
    }
}

type RaidProtectionConfig = NonNullable<GuildConfig["raid_protection"]>;

export default RaidProtectionService;
