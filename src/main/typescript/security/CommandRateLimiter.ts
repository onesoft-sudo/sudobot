/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import type Application from "@framework/app/Application";
import type { CommandManagerServiceInterface } from "@framework/contracts/CommandManagerServiceInterface";
import type CommandRateLimiterContract from "@framework/contracts/CommandRateLimiterContract";
import { HasApplication } from "@framework/types/HasApplication";
import type { Snowflake } from "discord.js";
import { Collection } from "discord.js";

class CommandRateLimiter extends HasApplication implements CommandRateLimiterContract {
    private static readonly INTERVAL = 1000 * 60 * 30; // 30 minutes
    private readonly cache = new Collection<
        `${Snowflake}_${string}` | `${Snowflake}_${Snowflake}_${string}`,
        { attempts: number; timestamp: number; deleteAfter: number }
    >();
    public constructor(application: Application) {
        super(application);

        setInterval(() => {
            const now = Date.now();

            for (const [key, { deleteAfter }] of this.cache) {
                if (now > deleteAfter) {
                    this.cache.delete(key);
                }
            }
        }, CommandRateLimiter.INTERVAL);
    }

    /**
     * Check if a command is rate limited for a user, and increment the attempt count if it is.
     *
     * @param commandName The command to check. Must be the canonical name of the command.
     * @param guildId The guild ID to check.
     * @param userId The user ID to check.
     * @returns A boolean indicating if the command is rate limited.
     */
    public async isRateLimitedWithHit(
        commandName: string,
        guildId: Snowflake,
        userId: Snowflake
    ): Promise<boolean> {
        const config =
            this.application.service("configManager").config[guildId]?.commands?.ratelimiting;
        const globalKey = `${userId}_${commandName}` as const;
        const guildKey = `${guildId}_${userId}_${commandName}` as const;
        const globalCache = this.cache.get(globalKey);
        const guildCache = this.cache.get(guildKey);
        const command = (
            this.application.service("commandManager") as CommandManagerServiceInterface
        ).getCommand(commandName);

        if (!command) {
            this.application.logger.warn(`CommandRateLimiter: Command ${commandName} not found.`);
            return false;
        }

        if (command.name !== commandName) {
            this.application.logger.warn(
                `CommandRateLimiter: Command ${commandName} does not match the canonical name ${command.name}.`
            );
            return false;
        }

        global: if (command.cooldown !== undefined) {
            if (globalCache) {
                if (Date.now() - globalCache.timestamp > command.cooldown) {
                    this.cache.delete(globalKey);
                    break global;
                }

                if (globalCache.attempts >= command.maxAttempts) {
                    globalCache.timestamp = Date.now();
                    globalCache.deleteAfter = Date.now() + command.cooldown;
                    this.application.logger.debug(
                        `CommandRateLimiter: Global ratelimit hit for ${userId}.`
                    );
                    return true;
                }

                globalCache.attempts++;
                break global;
            } else {
                this.cache.set(globalKey, {
                    attempts: 1,
                    timestamp: Date.now(),
                    deleteAfter: Date.now() + command.cooldown
                });
            }
        }

        if (!config) {
            return false;
        }

        const finalConfig = config.overrides[command.name] ?? config;

        if (!config.enabled || !finalConfig.enabled) {
            return false;
        }

        if (guildCache) {
            if (Date.now() - guildCache.timestamp > guildCache.deleteAfter) {
                this.cache.delete(guildKey);
                return false;
            }

            if (guildCache.attempts >= finalConfig.max_attempts) {
                guildCache.timestamp = Date.now();
                guildCache.deleteAfter = Date.now() + finalConfig.timeframe + config.block_duration;
                this.application.logger.debug(
                    `CommandRateLimiter: Guild ratelimit hit for ${userId} in ${guildId}.`
                );
                return true;
            }

            guildCache.attempts++;
        } else {
            this.cache.set(guildKey, {
                attempts: 1,
                timestamp: Date.now(),
                deleteAfter: Date.now() + finalConfig.timeframe + config.block_duration
            });
        }

        return false;
    }
}

export default CommandRateLimiter;
