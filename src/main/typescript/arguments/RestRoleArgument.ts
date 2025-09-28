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

import Argument from "@framework/arguments/Argument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import { fetchRole } from "@framework/utils/entities";
import { isSnowflake } from "@framework/utils/utils";
import type { ChatInputCommandInteraction, If, Role, Snowflake } from "discord.js";

declare global {
    interface ArgumentRules {
        "role_rest:all_required"?: boolean;
    }
}

class RestRoleArgument<E extends boolean = false> extends Argument<If<E, Role[], (Role | null)[]>> {
    public static readonly defaultErrors = {
        [ErrorType.Required]: "You must specify a role to perform this action!",
        [ErrorType.InvalidType]: "You must specify a valid role to perform this action.",
        [ErrorType.EntityNotFound]: "The role you specified could not be found."
    };

    public override validate() {
        if (this.argv.length <= this.position) {
            return this.error("Please specify at least one role resolvable!", ErrorType.Required);
        }

        return true;
    }

    protected toSnowflake(resolvable: string): Snowflake {
        if (resolvable.startsWith("<@&") && resolvable.endsWith(">")) {
            return resolvable.slice(3, -1);
        }

        return resolvable;
    }

    protected resolve(resolvable: string) {
        if ((resolvable.startsWith("<@&") && resolvable.endsWith(">")) || isSnowflake(resolvable)) {
            return fetchRole(this.context.guild, this.toSnowflake(resolvable)) as Promise<If<E, Role, Role | null>>;
        }

        return Promise.resolve(
            (this.context.guild.roles.cache.find(role => role.name === resolvable) ?? null) as If<E, Role, Role | null>
        );
    }

    protected override async transform() {
        const resolvables = this.argv.slice(this.position + 1);
        const roles = [] as unknown as If<E, Role[], (Role | null)[]>;

        for (const resolvable of resolvables) {
            const role = await this.resolve(resolvable);

            if (!role && this.rules?.["role_rest:all_required"]) {
                return this.error("Role not found", ErrorType.EntityNotFound);
            }

            roles.push(role as Role);
        }

        return roles;
    }

    public override postTransformValidation() {
        return true;
    }

    protected override async resolveFromInteraction(interaction: ChatInputCommandInteraction) {
        type FunctionReturnType = If<E, Role[], (Role | null)[]>;
        const value = interaction.options.getString(this.interactionName!);
        const roles = [] as unknown as FunctionReturnType;

        if (value === null && this.rules?.["interaction:no_required_check"] !== false) {
            return this.error(`${this.interactionName} is required!`, ErrorType.Required);
        }

        if (!value) {
            return [] as unknown as FunctionReturnType;
        }

        for (const resolvable of value.split(/\s+/)) {
            const role = await this.resolve(resolvable);

            if (!role && this.rules?.["role_rest:all_required"]) {
                return this.error("Role not found", ErrorType.EntityNotFound);
            }

            roles.push(role as Role);
        }

        return roles;
    }

    public override toString(): string {
        return this.transformedValue.map(role => role?.name).join(", ");
    }
}

export default RestRoleArgument;
