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

import APIErrors from "@framework/errors/APIErrors.js";
import { isDiscordAPIError } from "@framework/utils/errors.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { Role } from "discord.js";
import EntityArgument from "./EntityArgument.js";
import { ArgumentErrorType } from "./InvalidArgumentError.js";

class RoleArgument extends EntityArgument<Role> {
    public static readonly defaultErrors = {
        [ArgumentErrorType.Required]: "You must specify a role to perform this action!",
        [ArgumentErrorType.InvalidType]: "You must specify a valid role to perform this action.",
        [ArgumentErrorType.EntityNotFound]: "The role you specified could not be found."
    };
    protected override readonly mentionStart: string[] = ["<@&"];
    protected override readonly entityName: string = "role";

    protected override async resolveFromRawValue(): Promise<Role> {
        if (!this.context.guild) {
            return this.error(`Argument '${this.name}': Invalid context`, ArgumentErrorType.EntityNotFound);
        }

        try {
            const id = this.toSnowflake();
            const role = this.context.guild.roles.cache.get(id) ?? (await this.context.guild.roles.fetch(id));

            if (!role) {
                return this.error(`Argument '${this.name}': Unknown role`, ArgumentErrorType.EntityNotFound);
            }

            return role;
        } catch (error) {
            if (isDiscordAPIError(error)) {
                return this.error(
                    `Argument '${this.name}': ${APIErrors.translateToMessage(+error.code)}`,
                    ArgumentErrorType.EntityNotFound
                );
            }

            return this.error(`Argument '${this.name}': Unable to fetch role data`, ArgumentErrorType.EntityNotFound);
        }
    }

    protected override async resolveFromInteraction(interaction: ChatInputCommandInteraction): Promise<Role> {
        if (!this.context.guild) {
            return this.error(`Argument '${this.interactionName}': Invalid context`, ArgumentErrorType.EntityNotFound);
        }

        const value = interaction.options.getRole(this.interactionName);

        if (!value) {
            throw new Error("Received null from interaction resolver");
        }

        if (value instanceof Role) {
            return value;
        }

        try {
            const id = this.toSnowflake();
            const role = this.context.guild.roles.cache.get(id) ?? (await this.context.guild.roles.fetch(id));

            if (!role) {
                return this.error(`Argument '${this.name}': Unknown role`, ArgumentErrorType.EntityNotFound);
            }

            return role;
        } catch (error) {
            if (isDiscordAPIError(error)) {
                return this.error(
                    `Argument '${this.interactionName}': ${APIErrors.translateToMessage(+error.code)}`,
                    ArgumentErrorType.EntityNotFound
                );
            }

            return this.error(
                `Argument '${this.interactionName}': Unable to fetch role data`,
                ArgumentErrorType.EntityNotFound
            );
        }
    }
}

export default RoleArgument;
