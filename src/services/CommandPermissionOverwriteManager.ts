/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { CommandPermissionOverwrite } from "@prisma/client";
import { Awaitable, GuildMember, PermissionsString, Snowflake } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { log } from "../utils/Logger";
import { GetMemberPermissionInGuildResult } from "./PermissionManager";

export const name = "commandPermissionOverwriteManager";

export default class CommandPermissionOverwriteManager extends Service implements HasEventListeners {
    readonly permissionOverwrites = new Map<`${Snowflake}____${string}`, CommandPermissionOverwrite[]>();
    readonly validators: Array<keyof this> = [
        "validatePermissionOverwriteUsers",
        "validatePermissionOverwriteChannels",
        "validatePermissionOverwriteRoles",
        "validatePermissionOverwriteLevels",
        "validatePermissionOverwritePermissions"
    ];

    @GatewayEventListener("ready")
    async onReady() {
        log("Syncing command permission overwrites...");

        const permissionOverwrites = await this.client.prisma.commandPermissionOverwrite.findMany();
        this.permissionOverwrites.clear();

        for (const permissionOverwrite of permissionOverwrites) {
            for (const command of permissionOverwrite.commands) {
                const key = `${permissionOverwrite.guildId}____${command}` as const;
                let existingOverwriteArray = this.permissionOverwrites.get(key);

                if (!existingOverwriteArray) {
                    existingOverwriteArray = [];
                    this.permissionOverwrites.set(key, existingOverwriteArray);
                }

                existingOverwriteArray.push(permissionOverwrite);
            }
        }

        log("Successfully synced command permission overwrites");
    }

    async validatePermissionOverwritePermissions(
        permissionOverwrite: CommandPermissionOverwrite,
        _: ValidatePermissionOverwritesOptions,
        { permissions }: GetMemberPermissionInGuildResult
    ) {
        return (
            (permissionOverwrite.requiredPermissionMode === "AND" &&
                permissions.has(permissionOverwrite.requiredPermissions as PermissionsString[], true)) ||
            (permissionOverwrite.requiredPermissionMode === "OR" &&
                permissions.any(permissionOverwrite.requiredPermissions as PermissionsString[], true))
        );
    }

    validatePermissionOverwriteChannels(
        permissionOverwrite: CommandPermissionOverwrite,
        { channelId }: ValidatePermissionOverwritesOptions
    ) {
        if (permissionOverwrite.requiredChannels.length === 0) {
            return true;
        }

        return permissionOverwrite.requiredChannels.includes(channelId);
    }

    validatePermissionOverwriteUsers(
        permissionOverwrite: CommandPermissionOverwrite,
        { member }: ValidatePermissionOverwritesOptions
    ) {
        if (permissionOverwrite.requiredUsers.length === 0) {
            return true;
        }

        return permissionOverwrite.requiredUsers.includes(member.user.id);
    }

    validatePermissionOverwriteRoles(
        permissionOverwrite: CommandPermissionOverwrite,
        { member }: ValidatePermissionOverwritesOptions
    ) {
        if (permissionOverwrite.requiredRoles.length === 0) {
            return true;
        }

        for (const roleId of member.roles.cache.keys()) {
            if (permissionOverwrite.requiredRoles.includes(roleId)) {
                return true;
            }
        }

        return false;
    }

    validatePermissionOverwriteLevels(
        permissionOverwrite: CommandPermissionOverwrite,
        _: ValidatePermissionOverwritesOptions,
        permissions: GetMemberPermissionInGuildResult
    ) {
        if (permissions.type !== "levels" || permissionOverwrite.requiredLevel === null) {
            return true;
        }

        return permissions.level >= permissionOverwrite.requiredLevel;
    }

    async validatePermissionOverwrites(options: ValidatePermissionOverwritesOptions) {
        const { guildId, commandName, member } = options;
        const permissionOverwrites = this.client.commandPermissionOverwriteManager.permissionOverwrites.get(
            `${guildId!}____${commandName}`
        );
        const hasOverwrite = !!permissionOverwrites?.length;

        if (!permissionOverwrites?.length) {
            return { hasOverwrite: false, result: true };
        }

        const memberPermissions = await this.client.permissionManager.getMemberPermissions(member, true);
        let result = true;

        outerLoop: for (const permissionOverwrite of permissionOverwrites) {
            for (const validator of this.validators) {
                const method = this[validator] as PermissionValidatorFunction | undefined;
                const validationResult = !!(await method?.call(this, permissionOverwrite, options, memberPermissions));

                if (permissionOverwrite.mode === "AND" && !validationResult) {
                    return { hasOverwrite, result: false };
                }

                if (permissionOverwrite.mode === "OR" && validationResult) {
                    result &&= true;
                    continue outerLoop;
                }
            }

            result &&= permissionOverwrite.mode === "AND";

            if (!result) {
                break;
            }
        }

        return { hasOverwrite, result };
    }
}

type ValidatePermissionOverwritesOptions = {
    guildId: Snowflake;
    commandName: string;
    member: GuildMember;
    channelId: Snowflake;
};

type PermissionValidatorFunction = (
    permissionOverwrite: CommandPermissionOverwrite,
    { member }: ValidatePermissionOverwritesOptions,
    permissions?: GetMemberPermissionInGuildResult
) => Awaitable<boolean>;
