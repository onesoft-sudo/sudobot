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

export const GuildConfigurationSchema = Type.Object({
    commands: Type.Optional(
        Type.Object({
            prefix: Type.String({ default: "-", pattern: /^[^\s]+$/, minLength: 1 })
        })
    ),
    permissions: Type.Optional(
        Type.Object({
            mode: Type.Enum(["discord", "leveled", "selinux"])
        })
    )
});

export const GuildConfigurationSchemaValidator = Compile(GuildConfigurationSchema);
export type GuildConfigurationType = Type.Static<typeof GuildConfigurationSchema>;

export const GuildConfigurationDefaultValue = GuildConfigurationSchemaValidator.Parse({});
