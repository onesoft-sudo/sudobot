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

import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Logger } from "@framework/log/Logger";
import { Events } from "@framework/types/ClientEvents";
import type Client from "../core/Client";
import CommandManager from "../services/CommandManager";
import ConfigurationManager from "../services/ConfigurationManager";
import LogStreamingService from "../services/LogStreamingService";
import QueueService from "../services/QueueService";
import StartupManager from "../services/StartupManager";

class ReadyEventListener extends EventListener<Events.Ready, Client> {
    public override readonly name = Events.Ready;

    @Inject()
    public readonly configManager!: ConfigurationManager;

    @Inject()
    public readonly commandManager!: CommandManager;

    @Inject()
    public readonly startupManager!: StartupManager;

    @Inject()
    public readonly queueService!: QueueService;

    @Inject()
    public readonly logStreamingService!: LogStreamingService;

    @Inject()
    public readonly logger!: Logger;

    public override async execute() {
        this.logger.info(`Logged in as: ${this.client.user?.username}`);

        this.configManager.onReady();
        this.startupManager.onReady();
        this.commandManager.onReady();
        this.queueService.onReady();
        this.application.service("apiServer").onReady();

        const homeGuild = await this.client.getHomeGuild();

        if (this.configManager.systemConfig.sync_emojis) {
            try {
                const emojis = await homeGuild.emojis.fetch();

                for (const [id, emoji] of emojis) {
                    if (!this.client.emojis.cache.has(id)) {
                        this.client.emojis.cache.set(id, emoji);
                    }
                }

                this.logger.info("Successfully synced the emojis of home guild.");
            } catch (e) {
                this.logger.error(e);
                this.logger.warn(
                    "Failed to fetch some of the emojis. The bot may not show some of the emojis in it's responses if dependent on guild-specific emojis."
                );
            }

            try {
                await this.application.client.application?.emojis.fetch();
                this.logger.info("Successfully synced the application emojis.");
            } catch (e) {
                this.logger.error(e);
                this.logger.warn(
                    "Failed to fetch some of the emojis. The bot may not show some of the emojis in it's responses if dependent on application-specific emojis."
                );
            }
        }

        if (this.configManager.systemConfig.log_server?.auto_start) {
            this.logStreamingService.listen();
        }
    }
}

export default ReadyEventListener;
