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

import { Action } from "@framework/api/decorators/Action";
import { EnableGuildAccessControl } from "@framework/api/decorators/EnableGuildAccessControl";
import { RequireAuth } from "@framework/api/decorators/RequireAuth";
import Controller from "@framework/api/http/Controller";
import type Request from "@framework/api/http/Request";
import { APIErrorCode } from "@main/types/APIErrorCode";

class GuildController extends Controller {
    @Action("GET", "/guilds/:guild")
    @RequireAuth()
    @EnableGuildAccessControl()
    public view(request: Request) {
        const { id } = request.params;
        const guild = this.application.client.guilds.cache.get(id);

        if (!guild) {
            return this.error(404, {
                message: "Guild not found.",
                code: APIErrorCode.None
            });
        }

        return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon
        };
    }

    @Action("GET", "/guilds")
    @RequireAuth()
    public index(request: Request) {
        const guilds = [];

        for (const guild of this.application.client.guilds.cache.values()) {
            if (request.user?.guilds.includes(guild.id)) {
                guilds.push({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon
                });
            }
        }

        return guilds;
    }

    @Action("GET", "/guilds/:id/roles")
    @RequireAuth()
    public getRoles(request: Request) {
        const { id } = request.params;
        const guild = this.application.client.guilds.cache.get(id);

        if (!guild) {
            return this.error(404, {
                message: "Guild not found.",
                code: APIErrorCode.GuildNotFound
            });
        }

        return guild.roles.cache.map(role => ({
            id: role.id,
            name: role.name,
            color: role.color
        }));
    }

    @Action("GET", "/guilds/:id/channels")
    @RequireAuth()
    public getChannels(request: Request) {
        const { id } = request.params;
        const guild = this.application.client.guilds.cache.get(id);

        if (!guild) {
            return this.error(404, {
                message: "Guild not found.",
                code: APIErrorCode.GuildNotFound
            });
        }

        return guild.channels.cache.map(channel => ({
            id: channel.id,
            name: channel.name,
            type: channel.type
        }));
    }
}

export default GuildController;
