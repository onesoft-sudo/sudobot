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

Object.defineProperty(global, "isBundle", { value: true });

import "./preload";
import { BUNDLE_DATA_SYMBOL } from "@framework/utils/bundle";
import Resource from "@framework/resources/Resource";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file will only be created when a bundler is executed
import { classes, services, commands, events, resources } from "./imports.gen";

Object.defineProperty(global, BUNDLE_DATA_SYMBOL, {
    value: {
        classes,
        services,
        commands,
        events,
        resources
    }
});

for (const [id, data] of Object.entries(resources)) {
    Resource.registerResource(id, data);
}

import "./main";
