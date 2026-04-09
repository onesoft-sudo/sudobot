/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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

import AbstractDatabase from "@framework/database/AbstractDatabase";
import * as InfractionModels from "@main/models/Infraction";
import * as MuteRecordModels from "@main/models/MuteRecord";
import * as PermissionLevelModels from "@main/models/PermissionLevel";
import * as PermissionProfileModels from "@main/models/PermissionProfile";
import * as QueuedJobModels from "@main/models/QueuedJob";

const models = {
    ...InfractionModels,
    ...PermissionLevelModels,
    ...PermissionProfileModels,
    ...QueuedJobModels,
    ...MuteRecordModels
} as const;

type ModelRecordType = typeof models;

class Database extends AbstractDatabase<ModelRecordType> {
    protected override createSchema(): ModelRecordType {
        return models;
    }
}

export default Database;
