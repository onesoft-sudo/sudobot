/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import { Type } from "typebox";
import { Compile } from "typebox/compile";
import { SnowflakeSchema } from "./SnowflakeSchema";

export const EnvironmentVariableSchema = Type.Object({
    SUDOBOT_TOKEN: Type.String(),
    SUDOBOT_HOME_GUILD_ID: SnowflakeSchema,
    SUDOBOT_SHARD_COUNT: Type.Optional(Type.Integer({ minimum: 1 })),
    SUDOBOT_HIDE_MODIFICATIONS_URL_NOTICE: Type.Enum(["1", "0"], { default: "0" }),
    SUDOBOT_MODIFICATIONS_PUBLIC_URL: Type.Optional(Type.String({ format: "url" }))
});

export const EnvironmentVariableSchemaValidator = Compile(EnvironmentVariableSchema);
export type EnvironmentVariableType = Type.Static<typeof EnvironmentVariableSchema>;
