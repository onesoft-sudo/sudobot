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

export * from "./APIEndpoints.js";
export * from "./APIErrorCode.js";
export * from "./models/Guild.js";
export * from "./models/User.js";
export * from "./responses/AuthResponse.js";
export * from "./responses/GetGuildConfigurationResponse.js";
export * from "./responses/SetGuildConfigurationResponse.js";
export * from "./utils/Snowflake.js";

export const API_VERSION = 1;
