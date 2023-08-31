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

import { PermissionFlagsBits } from "discord.js";
import { z } from "zod";
import { Action } from "../../decorators/Action";
import { EnableGuildAccessControl } from "../../decorators/EnableGuildAccessControl";
import { RequireAuth } from "../../decorators/RequireAuth";
import { Validate } from "../../decorators/Validate";
import { zSnowflake } from "../../types/SnowflakeSchema";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class PermissionRoleController extends Controller {
    @Action("GET", "/permission_roles/:guild")
    @RequireAuth()
    @EnableGuildAccessControl()
    public async index(request: Request) {
        const data = await this.client.prisma.permissionRole.findMany({
            where: {
                guild_id: request.params.guild
            }
        });
        const guild = this.client.guilds.cache.get(request.params.guild);

        return data.map(permission => {
            const roles: { name: string; id: string }[] = [];
            const users: { name: string; id: string }[] = [];

            for (const roleId of permission.roles) {
                roles.push({ id: roleId, name: guild?.roles.cache.get(roleId)?.name ?? "[Not found in cache]" });
            }

            for (const userId of permission.users) {
                users.push({ id: userId, name: guild?.members.cache.get(userId)?.user.username ?? "[Not found in cache]" });
            }

            return {
                ...permission,
                roles,
                users
            };
        });
    }

    @Action("PATCH", "/permission_roles/:guild/:id")
    @RequireAuth()
    @EnableGuildAccessControl()
    @Validate(
        z.object({
            name: z.string().optional(),
            permissions: z.array(z.union(Object.keys(PermissionFlagsBits).map(p => z.literal(p)) as any)).optional(),
            users: z.array(zSnowflake).optional(),
            roles: z.array(zSnowflake).optional()
        })
    )
    public async update(request: Request) {
        if (Object.keys(request.parsedBody).length === 0) {
            return new Response({ status: 422, body: { error: "Nothing to update!" } });
        }

        const id = parseInt(request.params.id);

        if (!id || isNaN(id)) {
            return new Response({ status: 422, body: { error: "Invalid permission role ID." } });
        }

        const permissionRole = await this.client.prisma.permissionRole.findFirst({
            where: {
                guild_id: request.params.guild,
                id
            }
        });

        if (!permissionRole) {
            return new Response({ status: 404, body: { error: "The permission role could not be found." } });
        }

        const updates = {
            name: request.parsedBody.name,
            grantedPermissions: request.parsedBody.permissions,
            users: request.parsedBody.users,
            roles: request.parsedBody.roles
        };

        await this.client.prisma.permissionRole.updateMany({
            where: {
                guild_id: request.params.guild,
                id
            },
            data: updates
        });

        return {
            success: true,
            permission_role: { ...permissionRole, ...updates }
        };
    }
}
