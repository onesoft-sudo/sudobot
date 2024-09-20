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

import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Logger } from "@framework/log/Logger";
import { Events } from "@framework/types/ClientEvents";
import type Client from "../../core/Client";
import ConfigurationManager from "../../services/ConfigurationManager";
import type { Guild } from "discord.js";

class GuildCreateEventListener extends EventListener<Events.GuildCreate, Client> {
    public override readonly name = Events.GuildCreate;

    @Inject()
    public readonly configManager!: ConfigurationManager;

    @Inject()
    public readonly logger!: Logger;

    public override async execute(guild: Guild) {
        this.logger.info(`Joined a guild: ${guild.name} (${guild.id})`);

        if (!this.configManager.config[guild.id]) {
            this.logger.info(`Auto-configuring guild: ${guild.id}`);
            this.configManager.autoConfigure(guild.id);
        }
    }
}

export default ReadyEventListener;
