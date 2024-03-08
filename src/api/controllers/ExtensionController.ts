/*
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

import { Response as ExpressResponse } from "express";
import { Action } from "../../decorators/Action";
import { EnableAdminAccessControl } from "../../decorators/EnableAdminAccessControl";
import { RequireAuth } from "../../decorators/RequireAuth";
import Controller from "../Controller";
import Request from "../Request";

// TODO: Add a proper implementation for this controller
class ExtensionController extends Controller {
    @Action("GET", "/extensions/:id/install")
    @RequireAuth()
    @EnableAdminAccessControl()
    public async install(request: Request, response: ExpressResponse) {
        const { id } = request.params;
        const [extension, error] = await this.client.extensionService.getExtensionMetadata(id);

        if (error || !extension) {
            return response.status(500).json({
                message: "Failed to fetch extension metadata"
            });
        }

        if (!extension) {
            return response.status(404).json({
                message: "Extension not found"
            });
        }

        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        await this.client.extensionService.fetchAndInstallExtension(id, response);
        response.end();
    }
}

export default ExtensionController;
