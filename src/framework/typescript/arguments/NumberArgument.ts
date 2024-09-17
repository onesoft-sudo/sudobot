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
import Argument from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

class NumberArgument extends Argument<number> {
    public override toString(): string {
        return this.stringValue!.toString();
    }

    public override validate(): boolean {
        return true;
    }

    public override transform(): number {
        return parseFloat(this.stringValue);
    }

    public override postTransformValidation(): boolean {
        if (isNaN(this.transformedValue!)) {
            return this.error("Number must be a valid number", ErrorType.InvalidType);
        }

        if (this.rules?.["range:min"] && this.transformedValue! < this.rules?.["range:min"]) {
            return this.error("Number is too small", ErrorType.InvalidRange);
        }

        if (this.rules?.["range:max"] && this.transformedValue! > this.rules?.["range:max"]) {
            return this.error("Number is too large", ErrorType.InvalidRange);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<number> {
        const value = interaction.options.getNumber(this.name!, this.isRequired);

        if (value === null) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value;
    }
}

export default NumberArgument;
