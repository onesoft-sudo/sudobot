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

import { ClientEvents } from "discord.js";
import Event from "../core/Event";
import { logError, logInfo } from "../utils/logger";

export default class ReadyEvent extends Event {
    public name: keyof ClientEvents = 'ready';

    async execute() {
        logInfo("The bot has logged in.");
        this.client.server.start().catch(logError);
        this.client.queueManager.onReady().catch(logError);
    }
}
