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

import { Action } from "../../decorators/Action";
import { RequireAuth } from "../../decorators/RequireAuth";
import { request, wait } from "../../utils/utils";
import Controller from "../Controller";
import { Response as ExpressResponse } from "express";
import Request from "../Request";
import { cache } from "../../utils/cache";
import { ExtensionInfo } from "../../types/ExtensionInfo";
import { EnableAdminAccessControl } from "../../decorators/EnableAdminAccessControl";

// TODO: Add a proper implementation for this controller
class ExtensionController extends Controller {
    private readonly extensionIndexURL =
        "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/extensions/.extbuilds/index.json";

    @Action("GET", "/extensions/:id/install")
    @RequireAuth()
    @EnableAdminAccessControl()
    public async install(request: Request, response: ExpressResponse) {
        const { id } = request.params;
        const [data, error] = await cache(`extension-index`, () => this.fetchExtensionMetadata(), {
            ttl: 120_000, // 2 minutes,
            invoke: true
        });

        if (error || !data) {
            return response.status(500).json({
                message: "Failed to fetch extension metadata"
            });
        }

        const extension = data[id];

        if (!extension) {
            return response.status(404).json({
                message: "Extension not found"
            });
        }

        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.write(`Retrieving extension ${extension.name} from the SudoBot Extension Repository (SER)...\n`);
        await wait(2000);
        response.write(`Successfully retrieved extension ${extension.name} from the SER.\n`);
        response.write(`Extension Information\n`);
        response.write(`Extension ID: ${extension.id}\n`);
        response.write(`Version: ${extension.version}\n\n`);
        response.write(`Preparing to unpack ${extension.name} (${extension.version})...\n`);
        await wait(1500);
        response.write(`Unpacking ${extension.name} (${extension.version})...\n`);
        await wait(5000);
        response.write(`Setting up ${extension.name} (${extension.version})...\n`);
        await wait(500);
        response.write(`Loading ${extension.name} (${extension.version})...\n`);
        await wait(100);
        response.write(`Successfully installed extension ${extension.name}.\n`);
        response.end();
    }

    private async fetchExtensionMetadata() {
        const [response, error] = await request({
            method: "GET",
            url: this.extensionIndexURL
        });

        if (error || !response || response.status !== 200) {
            return [null, error] as const;
        }

        return [response.data as Record<string, ExtensionInfo | undefined>, null] as const;
    }
}

export default ExtensionController;
