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

import type { Command } from "../commands/Command";
import type Context from "../commands/Context";

export type ErrorMessages = {
    notSpecified?: string | ((subcommand: string) => string);
    notFound?: string | ((subcommand: string) => string);
}

export function SubcommandErrorMessage(messages: ErrorMessages): ClassDecorator {
    const handler = function (this: Command, context: Context, subcommand: string, errorType: "not_specified" | "not_found") {
        if (errorType === "not_found") {
            const message = typeof messages.notFound === "string" ? messages.notFound : messages.notFound?.(subcommand);
            return context.error(message ?? "Invalid subcommand provided");
        }

        const message = typeof messages.notSpecified === "string" ? messages.notSpecified : messages.notSpecified?.(subcommand);
        return context.error(message ?? "No subcommand provided");
    };

    return (target: object) => {
        Reflect.defineMetadata("command:subcommand_not_found_error", handler, target);
    };
}