import { Request, Response } from "express";
import DiscordClient from "../../client/Client";
import auth from "../Auth";
import guildAuth from "../GuildAuth";
import { Route } from "../Router";

export default <Route> {
    path: '/config/:guild',
    middleware: [guildAuth],
    get(req: Request, res: Response) {
        res.json(DiscordClient.client.config.props[req.params.guild]);
    }
};