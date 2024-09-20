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

import type { Awaitable, ChatInputCommandInteraction } from "discord.js";
import { ErrorType } from "./InvalidArgumentError";
import NumberArgument from "./NumberArgument";

class IntegerArgument extends NumberArgument {
    public override postTransformValidation(): boolean {
        if (!Number.isInteger(this.transformedValue)) {
            return this.error("Number must be an integer", ErrorType.InvalidType);
        }

        return super.postTransformValidation();
    }

    public override transform(): number {
        return parseInt(this.stringValue);
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<number> {
        const value = interaction.options.getInteger(this.name!, this.isRequired);

        if (value === null) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value;
    }
}

export default IntegerArgument;
