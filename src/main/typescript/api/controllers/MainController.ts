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

import { Action } from "@framework/api/decorators/Action";
import Controller from "@framework/api/http/Controller";
import { Inject } from "@framework/container/Inject";
import ConfigurationManager from "../../services/ConfigurationManager";

class MainController extends Controller {
    @Inject()
    protected readonly configManager!: ConfigurationManager;

    @Action("GET", "/")
    public index() {
        return {
            message: "API server is up."
        };
    }

    @Action("GET", "/status")
    public status() {
        const { server_status, server_status_description, server_status_started_at } =
            this.configManager.systemConfig.api;

        return {
            status: server_status,
            description: server_status_description,
            started: server_status_started_at ?? new Date(Date.now() + process.uptime() / 1000)
        };
    }
}

export default MainController;
