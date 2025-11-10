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

export const SystemConfigurationSchema = Type.Object({
    system_admins: Type.Array(SnowflakeSchema, { default: [] }),
    emoji_resolve_strategy: Type.Enum(["application", "home_guild", "both"], { default: "both" }),
    restart_exit_code: Type.Integer({ default: 0, minimum: 0, maximum: 255 }),
    presence: Type.Optional(
        Type.Object({
            type: Type.Enum(["Playing", "Streaming", "Listening", "Watching", "Competing", "Custom"], {
                default: "Watching"
            }),
            name: Type.String(),
            url: Type.Optional(
                Type.String({
                    format: "url"
                })
            ),
            status: Type.Enum(["online", "idle", "dnd", "invisible"], { default: "dnd" })
        })
    )
});

export const SystemConfigurationSchemaValidator = Compile(SystemConfigurationSchema);
export type SystemConfigurationType = Type.Static<typeof SystemConfigurationSchema>;

export const SystemConfigurationDefaultValue = SystemConfigurationSchemaValidator.Parse({});
