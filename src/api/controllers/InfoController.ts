
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

import { Collection } from "discord.js";
import { NextFunction, Response } from "express";
import KeyValuePair from "../../types/KeyValuePair";
import BaseCommand from "../../utils/structures/BaseCommand";
import Controller from "../Controller";
import RequireAuth from "../middleware/RequireAuth";
import ValidatorError from "../middleware/ValidatorError";
import Request from "../Request";

export default class InfoController extends Controller {
    globalMiddleware(): Function[] {
        return [RequireAuth, ValidatorError, (request: Request, response: Response, next: NextFunction) => {
            console.log(`URI: ` + request.path);

            if (request.path === "/systeminfo/commands") {
                next();
                return;
            }

            const { id } = request.params;

            if (!request.user?.guilds.includes(id)) {
                return response.status(403).send({ error: "You don't have permission to access information of this guild." });
            }

            if (id === "global" || !this.client.config.props[id]) {
                return response.status(404).send({ error: "No guild found with the given ID" });
            }

            next();
        }];
    }

    middleware(): KeyValuePair<Function[]> {
        return {
            
        };
    }

    public async indexChannels(request: Request) {
        const channels = this.client.guilds.cache.get(request.params.id)?.channels.cache;
        
        if (request.query?.types) {
            const types = request.query?.types.toString().split('|');
            return channels?.filter(channel => types.includes(channel.type));
        }

        return channels;
    }

    public async indexRoles(request: Request) {
        return this.client.guilds.cache.get(request.params.id)?.roles?.cache.sort((first, second) => second.position - first.position);
    }

    public async indexCommands() {
        const commands = new Collection<string, BaseCommand>();

        for (const [name, command] of this.client.commands) {
            if (command.getAliases().includes(name)) {
                console.log(command.getAliases(), "includes", name);
                continue;
            }

            if (commands.has(name) || command.ownerOnly) {
                console.log(commands.get(name)?.getName(), name);
                continue;
            }

            if (commands.get(name) !== command)
                commands.set(name, command);
        }
        
        return commands.map(command => ({
            ...command,
            permissions: command.permissions.map(perm => perm.toString()),
        }));
    }

    public async indexGuilds(request: Request) {
        return this.client.guilds.cache.filter(g => request.user?.guilds.includes(g.id) ?? false);
    }
}