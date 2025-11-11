/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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
import CommandManagerService from "@main/services/CommandManagerService";
import type { Client } from "discord.js";

class ClientReadyEventListener extends EventListener<Events.ClientReady> {
    public override readonly type = Events.ClientReady;

    @Inject()
    private readonly logger!: Logger;

    @Inject()
    private readonly commandManagerService!: CommandManagerService;

    public override onEvent(client: Client<true>) {
        this.logger.info(`Logged in successfully as: ${client.user.username} (${client.user.id})`);
        this.commandManagerService.onClientReady().catch(this.logger.error);
    }
}

export default ClientReadyEventListener;
