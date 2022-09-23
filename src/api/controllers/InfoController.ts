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