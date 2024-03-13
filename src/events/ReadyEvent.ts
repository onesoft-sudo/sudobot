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

import { logError, logInfo, logWarn } from "../components/io/Logger";
import type Client from "../core/Client";
import EventListener from "../core/EventListener";
import { Events } from "../types/ClientEvents";

export default class ReadyEvent extends EventListener<Events.Ready> {
    public readonly name = Events.Ready;

    async execute(client: Client<true>) {
        logInfo("The bot has logged in.");

        this.client.configManager.onReady();
        this.client.startupManager.onReady();
        await this.client.server.onReady();
        this.client.queueManager.onReady().catch(logError);
        const homeGuild = await this.client.getHomeGuild();

        if (this.client.configManager.systemConfig.sync_emojis) {
            try {
                const emojis = await homeGuild.emojis.fetch();

                for (const [id, emoji] of emojis) {
                    if (!this.client.emojis.cache.has(id)) {
                        this.client.emojis.cache.set(id, emoji);
                        this.client.emojiMap.set(emoji.name ?? emoji.identifier, emoji);
                    }
                }

                logInfo("Successfully synced the emojis of home guild.");
            } catch (e) {
                logError(e);
                logWarn(
                    "Failed to fetch some of the emojis. The bot may not show some of the emojis in it's responses."
                );
            }
        }

        if (client.configManager.systemConfig.log_server?.auto_start) {
            this.client.logServer.listen();
        }
    }
}
