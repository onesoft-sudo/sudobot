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
import { ArgumentErrorType } from "./InvalidArgumentError";

class DurationArgument extends Argument<Duration> {
    public static readonly defaultErrors = {
        [ArgumentErrorType.Required]: "You must specify a duration/time to perform this action!",
        [ArgumentErrorType.InvalidType]: "You must specify a valid duration/time to perform this action.",
        [ArgumentErrorType.InvalidRange]: "The given duration/time is out of range."
    };

    public override resolveFromRawValue(): Duration {
        try {
            return Duration.fromDurationStringExpression(this.rawValue);
        }
        catch (error) {
            if (error instanceof DurationParseError) {
                return this.error(error.message, ArgumentErrorType.InvalidType);
            }

            throw error;
        }
    }

    public override postValidate(): boolean {
        const durationValue = typeof this.value === "number" ? this.value : (this.value?.toMilliseconds() ?? 0);
        const rangeMinRuleValue = this.getRuleValue("range:min");
        const rangeMaxRuleValue = this.getRuleValue("range:max");

        if (typeof rangeMinRuleValue === "number" && durationValue < rangeMinRuleValue) {
            return this.error(
                this.getRuleErrorMessage("range:min") ?? `Argument '${this.name}': Duration value is too short`,
                ArgumentErrorType.InvalidRange
            );
        }

        if (typeof rangeMaxRuleValue === "number" && durationValue > rangeMaxRuleValue) {
            return this.error(
                this.getRuleErrorMessage("range:max") ?? `Argument '${this.name}': Duration value is too long`,
                ArgumentErrorType.InvalidRange
            );
        }

        return true;
    }

    protected override resolveFromInteraction(interaction: ChatInputCommandInteraction): Awaitable<Duration> {
        const value = interaction.options.getString(this.interactionName, !this.definition.isOptional);

        if (value === null) {
            return this.error(`${this.interactionName} is required!`, ArgumentErrorType.Required);
        }

        try {
            return Duration.fromDurationStringExpression(value);
        } catch (error) {
            if (error instanceof DurationParseError) {
                return this.error(error.message, ArgumentErrorType.InvalidType);
            }

            throw error;
        }
    }
}

export default DurationArgument;
