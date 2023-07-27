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

import { Collection, Guild } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";

export const name = "antijoin";

export default class Antijoin extends Service {
    map = new Collection<string, boolean>();

    @GatewayEventListener("ready")
    async onReady() {
        for (const [id] of this.client.guilds.cache) this.map.set(id, false);
    }

    enable(guild: Guild) {
        this.map.set(guild.id, true);
    }

    disable(guild: Guild) {
        this.map.set(guild.id, false);
    }

    toggle(guild: Guild) {
        return this.map.set(guild.id, !this.map.get(guild.id)).get(guild.id);
    }
}
