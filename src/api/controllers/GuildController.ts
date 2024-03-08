/*
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

import { Action } from "../../decorators/Action";
import { EnableGuildAccessControl } from "../../decorators/EnableGuildAccessControl";
import { RequireAuth } from "../../decorators/RequireAuth";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class GuildController extends Controller {
    @Action("GET", "/guild/:guild/channels")
    @RequireAuth()
    @EnableGuildAccessControl()
    public async indexChannels(request: Request) {
        const guild = this.client.guilds.cache.get(request.params.guild);

        if (!guild) {
            return new Response({ status: 404, body: { error: "No such guild found." } });
        }

        return guild.channels.cache;
    }

    @Action("GET", "/guild/:guild/roles")
    @RequireAuth()
    @EnableGuildAccessControl()
    public async indexRoles(request: Request) {
        const guild = this.client.guilds.cache.get(request.params.guild);

        if (!guild) {
            return new Response({ status: 404, body: { error: "No such guild found." } });
        }

        return guild.roles.cache;
    }
}
