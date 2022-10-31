/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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

import { readdir } from "fs/promises";
import path from "path";
import DiscordClient from "../client/Client";
import Service from "../utils/structures/Service";
import Controller from "./Controller";
import Route from "./Route";
import Server from "./Server";

export interface RouterOptions {
    routesDir: string;
}

export default class Router extends Service {
    routesDir: string;
    controllerObjects: Array <Controller> = [];
    routes: Route[] = [];

    constructor(client: DiscordClient, protected server: Server, { routesDir }: RouterOptions) {
        super(client);
        this.routesDir = routesDir;
    }

    async loadRoutes() {
        const files = await readdir(this.routesDir);

        for await (const file of files) {
            if (!file.endsWith('.ts') && !file.endsWith('.js')) {
                continue;
            }

            // console.log(`Loading routes from "${file}"...`);

            await import(path.join(this.routesDir, file));
        }
    }

    static insert(method: string, path: string, callback: [typeof Controller, string]) {
        let controller = DiscordClient.client.server.router.controllerObjects.find(c => c instanceof callback[0]);

        if (!controller) {
            controller = new callback[0](DiscordClient.client);
            DiscordClient.client.server.router.controllerObjects.push(controller);
            // console.log("Pushed a controller");
        }

        const route = new Route(method, path, [controller, callback[1]]);
        DiscordClient.client.server.router.routes.push(route);
        return route;
    }
    
    static get(path: string, callback: [typeof Controller, string]) {
        return Router.insert("GET", path, callback);
    }
    
    static post(path: string, callback: [typeof Controller, string]) {
        return Router.insert("POST", path, callback);
    }
    
    static put(path: string, callback: [typeof Controller, string]) {
        return Router.insert("PUT", path, callback);
    }
    
    static patch(path: string, callback: [typeof Controller, string]) {
        return Router.insert("PATCH", path, callback);
    }
    
    static delete(path: string, callback: [typeof Controller, string]) {
        return Router.insert("DELETE", path, callback);
    }

    static resource(path: string, controller: typeof Controller, { get = true, post = true, put = true, patch = true, del = true }: { get?: boolean, post?: boolean, put?: boolean, patch?: boolean, del?: boolean } = {}) {
        return {
            get: get ? Router.get(path, [controller, 'index']) : undefined,
            post: post ? Router.post(path, [controller, 'create']) : undefined,
            put: put ? Router.put(path, [controller, 'update']) : undefined,
            patch: patch ? Router.patch(path, [controller, 'update']) : undefined,
            delete: del ? Router.delete(path, [controller, 'delete']) : undefined,
        };
    }
}