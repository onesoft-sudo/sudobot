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

import type { GuildBasedChannel, GuildMember, Role, Snowflake, User } from "discord.js";
import { isSnowflake } from "../utils/utils";
import Argument from "./Argument";
import { ArgumentErrorType } from "./InvalidArgumentError";

abstract class EntityArgument<E extends User | GuildMember | GuildBasedChannel | Role | null> extends Argument<E> {
    protected abstract readonly mentionStart: string[];
    protected abstract readonly entityName: string;

    public toSnowflake(): Snowflake {
        let snowflake = this.rawValue;

        for (const start of this.mentionStart) {
            if (snowflake.startsWith(start)) {
                snowflake = snowflake.slice(start.length, -1);
                break;
            }
        }

        return snowflake;
    }

    public override preValidate(): boolean {
        if (!isSnowflake(this.toSnowflake())) {
            return this.error(
                `Argument '${this.name}': Must be a valid ${this.entityName} snowflake ID or mention`,
                ArgumentErrorType.InvalidType
            );
        }

        return true;
    }
}

export default EntityArgument;
