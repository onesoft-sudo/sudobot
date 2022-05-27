import { Request, Response } from "express";
import DiscordClient from "../../client/Client";
import auth from "../Auth";
import guildAuth from "../GuildAuth";
import { Route } from "../Router";

export default <Route> {
    path: '/channels/:guild',
    middleware: [guildAuth],
    async get(req: Request, res: Response) {
        const guild = await DiscordClient.client.guilds.fetch(req.params.guild);
        const channels = await guild.channels.cache.toJSON();
        res.send(channels);
    }
};