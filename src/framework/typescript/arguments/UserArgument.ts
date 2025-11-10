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

import { type Awaitable, type ChatInputCommandInteraction, type User } from "discord.js";
import Application from "../app/Application";
import type { If } from "../types/Utils";
import { fetchUser } from "../utils/entities";
import EntityArgument from "./EntityArgument";
import { ArgumentErrorType } from "./InvalidArgumentError";
import { isDiscordAPIError } from "@framework/utils/errors";
import APIErrors from "@framework/errors/APIErrors";

class UserArgument<E extends boolean = false> extends EntityArgument<If<E, User, User | null>> {
    public static readonly defaultErrors = {
        [ArgumentErrorType.Required]: "You must specify a user to perform this action!",
        [ArgumentErrorType.InvalidType]: "You must specify a valid user to perform this action.",
        [ArgumentErrorType.EntityNotFound]: "The user you specified could not be found."
    };
    protected override readonly mentionStart: string[] = ["<@!", "<@"];
    protected override readonly entityName: string = "user";

    protected override async resolveFromRawValue(): Promise<If<E, User, User | null>> {
        try {
            const user = await fetchUser(Application.current().client, this.toSnowflake());
            return user as If<E, User, User | null>;
        } catch (error) {
            if (isDiscordAPIError(error)) {
                return this.error(
                    `Argument '${this.interactionName}': ${APIErrors.translateToMessage(+error.code)}`,
                    ArgumentErrorType.EntityNotFound
                );
            }

            return this.error(
                `Argument '${this.interactionName}': Unable to fetch user data`,
                ArgumentErrorType.EntityNotFound
            );
        }
    }

    public override postValidate() {
        if (!this.value) {
            return this.error(`Argument '${this.interactionName}': User not found`, ArgumentErrorType.EntityNotFound);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<If<E, User, User | null>> {
        const value = interaction.options.getUser(this.interactionName, !this.definition.isOptional);

        if (value === null && !this.definition.isOptional) {
            return this.error(`Argument '${this.interactionName}' is required!`, ArgumentErrorType.Required);
        }

        return value as If<E, User, User | null>;
    }
}

export default UserArgument;
