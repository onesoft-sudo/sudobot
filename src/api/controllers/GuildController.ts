import { Response as ExpressResponse } from "express";
import { Action } from "../../decorators/Action";
import { EnableGuildAccessControl } from "../../decorators/EnableGuildAccessControl";
import { RequireAuth } from "../../decorators/RequireAuth";
import Controller from "../Controller";
import Request from "../Request";
import Response from "../Response";

export default class GuildController extends Controller {
    @Action("GET", "/guild/:guild/channels")
    @RequireAuth()
    @EnableGuildAccessControl()
    public async indexChannels(request: Request, response: ExpressResponse) {
        const guild = this.client.guilds.cache.get(request.params.guild);

        if (!guild) {
            return new Response({ status: 404, body: { error: "No such guild found." } });
        }

        return guild.channels.cache;
    }

    @Action("GET", "/guild/:guild/roles")
    @RequireAuth()
    @EnableGuildAccessControl()
    public async indexRoles(request: Request, response: ExpressResponse) {
        const guild = this.client.guilds.cache.get(request.params.guild);

        if (!guild) {
            return new Response({ status: 404, body: { error: "No such guild found." } });
        }

        return guild.roles.cache;
    }
}
