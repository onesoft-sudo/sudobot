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
import { ArgumentErrorType } from "./InvalidArgumentError";

class NumberArgument extends Argument<number> {
    public override resolveFromRawValue(): number {
        return +this.rawValue;
    }

    public override postValidate(): boolean {
        if (isNaN(this.value!)) {
            return this.error(`Argument '${this.name}': Must be a valid number`, ArgumentErrorType.InvalidType);
        }

        const rangeMinRuleValue = this.getRuleValue("range:min");
        const rangeMaxRuleValue = this.getRuleValue("range:max");

        if (typeof rangeMinRuleValue === "number" && this.value! < rangeMinRuleValue) {
            return this.error(
                this.getRuleErrorMessage("range:min") ?? `Argument '${this.name}': Numeric value is too small`,
                ArgumentErrorType.InvalidRange
            );
        }

        if (typeof rangeMaxRuleValue === "number" && this.value! > rangeMaxRuleValue) {
            return this.error(
                this.getRuleErrorMessage("range:max") ?? `Argument '${this.name}': Numeric value is too large`,
                ArgumentErrorType.InvalidRange
            );
        }

        return true;
    }

    protected override resolveFromInteraction(interaction: ChatInputCommandInteraction): Awaitable<number> {
        const value = interaction.options.getNumber(this.interactionName, !this.definition.isOptional);

        if (value === null) {
            return this.error(`Argument '${this.interactionName}' is required!`, ArgumentErrorType.Required);
        }

        return value;
    }
}

export default NumberArgument;
