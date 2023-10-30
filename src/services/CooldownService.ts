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

import { Snowflake } from "discord.js";
import Service from "../core/Service";

export const name = "cooldown";

export default class CooldownService extends Service {
    protected readonly underCooldown: Record<`${Snowflake}_${string}`, number | undefined> = {};

    has(guildId: Snowflake, commandName: string) {
        return !!this.underCooldown[`${guildId}_${commandName}`];
    }

    /**
     * Locks a cooldown entry.
     *
     * @param guildId
     * @param commandName
     * @param cooldownValue The cooldown time interval in milliseconds
     */
    lock(guildId: Snowflake, commandName: string, cooldownValue: number) {
        if (this.has(guildId, commandName)) {
            return { enabled: true, cooldown: this.underCooldown[`${guildId}_${commandName}`] };
        }

        this.underCooldown[`${guildId}_${commandName}`] = Date.now() + cooldownValue;
        setTimeout(() => (this.underCooldown[`${guildId}_${commandName}`] = undefined), cooldownValue);
        return { enabled: false, cooldown: this.underCooldown[`${guildId}_${commandName}`] };
    }
}
