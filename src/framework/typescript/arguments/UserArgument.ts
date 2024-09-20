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

import type { Awaitable, ChatInputCommandInteraction, User } from "discord.js";
import Application from "../app/Application";
import type { If } from "../types/Utils";
import { fetchUser } from "../utils/entities";
import EntityArgument from "./EntityArgument";
import { ErrorType } from "./InvalidArgumentError";

class UserArgument<E extends boolean = false> extends EntityArgument<If<E, User, User | null>> {
    public static readonly defaultErrors = {
        [ErrorType.Required]: "You must specify a user to perform this action!",
        [ErrorType.InvalidType]: "You must specify a valid user to perform this action.",
        [ErrorType.EntityNotFound]: "The user you specified could not be found."
    };
    protected override readonly mentionStart: string[] = ["<@!", "<@"];

    protected override transform(): Promise<If<E, User, User | null>> {
        return fetchUser(Application.current().getClient(), this.toSnowflake()) as Promise<
            If<E, User, User | null>
        >;
    }

    public override postTransformValidation() {
        if (!this.transformedValue) {
            return this.error("User not found", ErrorType.EntityNotFound);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<User> {
        const value = interaction.options.getUser(this.name!, this.isRequired);

        if (value === null) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value;
    }
}

export default UserArgument;
