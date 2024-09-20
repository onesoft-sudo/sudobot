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

import { fetchMember } from "@framework/utils/entities";
import type { Awaitable, ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { If } from "../types/Utils";
import EntityArgument from "./EntityArgument";
import { ErrorType } from "./InvalidArgumentError";

class GuildMemberArgument<E extends boolean = false> extends EntityArgument<
    If<E, GuildMember, GuildMember | null>
> {
    public static readonly defaultErrors = {
        [ErrorType.Required]: "You must specify a member to perform this action!",
        [ErrorType.InvalidType]: "You must specify a valid member to perform this action.",
        [ErrorType.EntityNotFound]: "The member you specified could not be found."
    };
    protected override readonly mentionStart: string[] = ["<@!", "<@"];

    protected override transform(): Promise<If<E, GuildMember, GuildMember | null>> {
        return fetchMember(this.context.guild, this.toSnowflake()) as Promise<
            If<E, GuildMember, GuildMember | null>
        >;
    }

    public override postTransformValidation() {
        if (!this.transformedValue) {
            return this.error("Member not found", ErrorType.EntityNotFound);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<GuildMember> {
        const value = interaction.options.getMember(this.name!);

        if (value === null && this.rules?.["interaction:no_required_check"] !== false) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value as GuildMember;
    }
}

export default GuildMemberArgument;
