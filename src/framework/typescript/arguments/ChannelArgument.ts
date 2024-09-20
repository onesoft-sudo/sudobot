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

import { fetchChannel } from "@framework/utils/entities";
import { isSnowflake } from "@framework/utils/utils";
import {
    type Awaitable,
    type ChatInputCommandInteraction,
    type GuildBasedChannel
} from "discord.js";
import type { If } from "../types/Utils";
import EntityArgument from "./EntityArgument";
import { ErrorType } from "./InvalidArgumentError";

class ChannelArgument<E extends boolean = false> extends EntityArgument<
    If<E, GuildBasedChannel, GuildBasedChannel | null>
> {
    public static readonly defaultErrors = {
        [ErrorType.Required]: "You must specify a channel to perform this action!",
        [ErrorType.InvalidType]: "You must specify a valid channel to perform this action.",
        [ErrorType.EntityNotFound]: "The channel you specified could not be found."
    };
    protected override readonly mentionStart: string[] = ["<#"];

    public override validate() {
        return true;
    }

    protected override async transform(): Promise<
        If<E, GuildBasedChannel, GuildBasedChannel | null>
    > {
        if (
            (this.stringValue.startsWith("<#") && this.stringValue.endsWith(">")) ||
            isSnowflake(this.stringValue)
        ) {
            return fetchChannel(this.context.guild, this.toSnowflake()) as Promise<
                If<E, GuildBasedChannel, GuildBasedChannel | null>
            >;
        }

        return null as If<E, GuildBasedChannel, GuildBasedChannel | null>;
    }

    public override postTransformValidation() {
        if (!this.transformedValue) {
            return this.error("Member not found", ErrorType.EntityNotFound);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<GuildBasedChannel> {
        const value = interaction.options.getChannel(this.name!);

        if (value === null && this.rules?.["interaction:no_required_check"] !== false) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value as GuildBasedChannel;
    }
}

export default ChannelArgument;
