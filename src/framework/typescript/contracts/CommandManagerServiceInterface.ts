/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import type ArgumentParser from "@framework/arguments/ArgumentParser";
import type { Command } from "@framework/commands/Command";
import type CommandRateLimiterContract from "@framework/contracts/CommandRateLimiterContract";
import type { Awaitable } from "discord.js";
import type Context from "../commands/Context";
import type { MemberPermissionData } from "./PermissionManagerInterface";

export type CommandPermissionCheckResult = {
    allow: boolean;
    overwrite: boolean;
};

export interface CommandManagerServiceInterface {
    checkCommandPermissionOverwrites(
        context: Context,
        name: string,
        alreadyComputedPermissions?: MemberPermissionData
    ): Awaitable<CommandPermissionCheckResult | null>;
    addCommand(
        command: Command,
        loadMetadata: boolean,
        groups: Record<string, string> | null,
        defaultGroup?: string
    ): Awaitable<void>;
    getCommand(name: string): Command | null;
    getRateLimiter(): CommandRateLimiterContract;
    getArgumentParser(): ArgumentParser;
}
