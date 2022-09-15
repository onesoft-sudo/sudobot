import { dot, object } from "dot-object";
import { NextFunction, Response } from "express";
import { body } from "express-validator";
import KeyValuePair from "../../types/KeyValuePair";
import Controller from "../Controller";
import RequireAuth from "../middleware/RequireAuth";
import ValidatorError from "../middleware/ValidatorError";
import Request from "../Request";

export default class InfoController extends Controller {
    globalMiddleware(): Function[] {
        return [RequireAuth, ValidatorError, (request: Request, response: Response, next: NextFunction) => {
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
}