import { Response } from "express";
import { Action } from "../../decorators/Action";
import { RequireAuth } from "../../decorators/RequireAuth";
import Controller from "../Controller";
import Request from "../Request";

export default class ConfigController extends Controller {
    guildConfigAccessControl(request: Request, response: Response) {
        if (!request.user!.guilds.includes(request.params.id)) {
            response.status(403).json({
                error: "You don't have permission to access this resource."
            });

            return false;
        }

        return true;
    }

    @Action("GET", "/config/:id")
    @RequireAuth()
    public async index(request: Request, response: Response) {
        if (!this.guildConfigAccessControl(request, response)) {
            return;
        }

        return {
            config: this.client.configManager.config[request.params.id] ?? null
        };
    }

    @Action("PUT", "/config/:id")
    @Action("PATCH", "/config/:id")
    @RequireAuth()
    public async update(request: Request, response: Response) {
        return { abc: true };
    }
}
