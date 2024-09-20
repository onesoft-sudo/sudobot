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

export enum ErrorType {
    Required = "Required",
    InvalidType = "InvalidType",
    OptionRequiresValue = "OptionRequiresValue",
    InvalidRange = "InvalidRange",
    EntityNotFound = "EntityNotFound"
}

export type Meta = {
    type?: ErrorType;
    cause?: unknown;
    noSkip?: boolean;
};

export class InvalidArgumentError extends Error {
    public override readonly name = "InvalidArgumentError";

    public constructor(
        message: string,
        public readonly meta: Meta
    ) {
        super(message, {
            cause: meta.cause
        });
    }
}
