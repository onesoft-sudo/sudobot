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
import { fetchMember } from "@framework/utils/entities";
import GuildSetupService from "@main/services/GuildSetupService";
import type { Guild } from "discord.js";
import type Client from "../../core/Client";
import ConfigurationManager from "../../services/ConfigurationManager";

class GuildCreateEventListener extends EventListener<Events.GuildCreate, Client> {
    public override readonly name = Events.GuildCreate;

    @Inject()
    private readonly configManager!: ConfigurationManager;

    @Inject()
    private readonly logger!: Logger;

    @Inject()
    private readonly guildSetupService!: GuildSetupService;

    public override async execute(guild: Guild) {
        this.logger.info(`Joined a guild: ${guild.name} (${guild.id})`);

        if (!this.configManager.config[guild.id]) {
            this.logger.info(`Auto-configuring guild: ${guild.id}`);
            this.configManager.autoConfigure(guild.id);

            await this.configManager.write({
                system: false,
                guild: true
            });
            await this.configManager.load();
        }

        const integration = await guild.fetchIntegrations();
        const id = this.client.application?.id;

        if (!id) {
            return;
        }

        const systemIntegration = integration.find(
            integration => integration.application?.id === id
        );

        if (!systemIntegration?.user) {
            return;
        }

        const member = await fetchMember(guild, systemIntegration.user.id);

        if (!member) {
            return;
        }

        await this.guildSetupService.initialize(member, member.id).catch(this.logger.error);
    }
}

export default GuildCreateEventListener;
