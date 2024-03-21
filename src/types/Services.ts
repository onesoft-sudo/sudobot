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

import type APIServer from "../framework/api/APIServer";
import type { ServiceManager } from "../framework/services/ServiceManager";
import type CommandManager from "../services/CommandManager";
import type ConfigurationManager from "../services/ConfigurationManager";
import type ExtensionManager from "../services/ExtensionManager";
import type LogStreamingService from "../services/LogStreamingService";
import PermissionManagerService from "../services/PermissionManagerService";
import type StartupManager from "../services/StartupManager";

export interface ServiceRecord {
    commandManager: CommandManager;
    configManager: ConfigurationManager;
    extensionManager: ExtensionManager;
    logStreamingService: LogStreamingService;
    apiServer: APIServer;
    startupManager: StartupManager;
    serviceManager: ServiceManager;
    permissionManager: PermissionManagerService;
}

interface ServiceRecordLocal extends ServiceRecord {}

declare global {
    interface ServiceRecord extends ServiceRecordLocal {}
}
