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

class StringArgument extends Argument<string> {
    public override toString(): string {
        return this.getValue();
    }

    public override validate(): boolean {
        if (!this.stringValue.length) {
            return this.error("String cannot be empty", ErrorType.InvalidType);
        }

        return true;
    }

    public override transform() {
        return this.stringValue;
    }

    public override postTransformValidation(): Awaitable<boolean> {
        if (
            this.rules?.["range:min"] &&
            this.transformedValue.length < this.rules?.["range:min"]
        ) {
            return this.error("String is too short", ErrorType.InvalidRange);
        }

        if (
            this.rules?.["range:max"] &&
            this.transformedValue.length > this.rules?.["range:max"]
        ) {
            return this.error("String is too long", ErrorType.InvalidRange);
        }

        return true;
    }

    protected override resolveFromInteraction(
        interaction: ChatInputCommandInteraction
    ): Awaitable<string> {
        const value = interaction.options.getString(this.name!, this.isRequired);

        if (value === null) {
            return this.error(`${this.name} is required!`, ErrorType.Required);
        }

        return value;
    }
}

export default StringArgument;
