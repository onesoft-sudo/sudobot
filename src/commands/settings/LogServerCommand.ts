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

import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class LogServerCommand extends Command {
    public readonly name = "logserver";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly systemAdminOnly = true;
    public readonly supportsInteractions = false;
    public readonly description = "Start/stop the real-time log streaming server.";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (!this.client.configManager.systemConfig.log_server?.enabled) {
            await this.error(message, "Log server is disabled in the system configuration.");
            return;
        }

        if (!this.client.logServer.io) {
            this.client.logServer.start();
            await this.success(message, "The log server has started.");
        } else {
            this.client.logServer.close();
            await this.success(message, "The log server has stopped.");
        }
    }
}
