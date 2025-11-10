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
import { ArgumentErrorType } from "./InvalidArgumentError";
import APIErrors from "@framework/errors/APIErrors";
import { isDiscordAPIError } from "@framework/utils/errors";

class GuildMemberArgument<E extends boolean = false> extends EntityArgument<If<E, GuildMember, GuildMember | null>> {
    public static readonly defaultErrors = {
        [ArgumentErrorType.Required]: "You must specify a member to perform this action!",
        [ArgumentErrorType.InvalidType]: "You must specify a valid member to perform this action.",
        [ArgumentErrorType.EntityNotFound]: "The member you specified could not be found."
    };
    protected override readonly mentionStart: string[] = ["<@!", "<@"];
    protected override readonly entityName: string = "member";

    protected override async resolveFromRawValue(): Promise<If<E, GuildMember, GuildMember | null>> {
        if (!this.context.guild) {
            return null as If<E, GuildMember, GuildMember | null>;
        }

        try {
            const member = await fetchMember(this.context.guild, this.toSnowflake());
            return member as If<E, GuildMember, GuildMember | null>;
        } catch (error) {
            if (isDiscordAPIError(error)) {
                return this.error(
                    `Argument '${this.interactionName}': ${APIErrors.translateToMessage(+error.code)}`,
                    ArgumentErrorType.EntityNotFound
                );
            }

            return this.error(
                `Argument '${this.interactionName}': Unable to fetch member data`,
                ArgumentErrorType.EntityNotFound
            );
        }
    }

    public override postValidate() {
        if (!this.value) {
            return this.error(`Argument '${this.interactionName}': Member not found`, ArgumentErrorType.EntityNotFound);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<If<E, GuildMember, GuildMember | null>> {
        const value = interaction.options.getMember(this.interactionName);

        if (value === null && !this.definition.isOptional) {
            return this.error(`Argument '${this.interactionName}' is required!`, ArgumentErrorType.Required);
        }

        return value as If<E, GuildMember, GuildMember | null>;
    }
}

export default GuildMemberArgument;
