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

import Duration from "@framework/datetime/Duration";
import DurationParseError from "@framework/datetime/DurationParseError";
import type { Awaitable, ChatInputCommandInteraction } from "discord.js";
import Argument from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

class DurationArgument extends Argument<Duration> {
    public static readonly defaultErrors = {
        [ErrorType.Required]: "You must specify a duration/time to perform this action!",
        [ErrorType.InvalidType]: "You must specify a valid duration/time to perform this action.",
        [ErrorType.InvalidRange]: "The given duration/time is out of range."
    };

    public override toString(): string {
        return this.stringValue.toString();
    }

    public override validate(): boolean {
        return true;
    }

    public override transform(): Duration {
        try {
            return Duration.fromDurationStringExpression(this.stringValue);
        } catch (error) {
            if (error instanceof DurationParseError) {
                return this.error(error.message, ErrorType.InvalidType);
            }

            throw error;
        }
    }

    public override postTransformValidation(): boolean {
        const durationValue =
            typeof this.transformedValue === "number" ? this.transformedValue : this.transformedValue.toMilliseconds();

        if (this.rules?.["range:min"] && durationValue < this.rules?.["range:min"]) {
            return this.error("Duration is too small", ErrorType.InvalidRange);
        }

        if (this.rules?.["range:max"] && durationValue > this.rules?.["range:max"]) {
            return this.error("Duration is too large", ErrorType.InvalidRange);
        }

        return true;
    }

    protected override resolveFromInteraction(interaction: ChatInputCommandInteraction): Awaitable<Duration> {
        const value = interaction.options.getString(this.interactionName!, this.isRequired);

        if (value === null) {
            return this.error(`${this.interactionName} is required!`, ErrorType.Required);
        }
        try {
            return Duration.fromDurationStringExpression(value);
        } catch (error) {
            if (error instanceof DurationParseError) {
                return this.error(error.message, ErrorType.InvalidType);
            }

            throw error;
        }
    }
}

export default DurationArgument;
