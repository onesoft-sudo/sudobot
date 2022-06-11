import { Request, Response } from "express";
import DiscordClient from "../../client/Client";
import auth from "../Auth";
import guildAuth from "../GuildAuth";
import { Route } from "../Router";

export default <Route> {
    path: '/guild/:guild',
    async get(req: Request, res: Response) {
        if (!req.params.guild)
            return res.json({msg: 'Guild ID is required', code: 100});
        
        try {
            const guild = await DiscordClient.client.guilds.fetch(req.params.guild);
            await res.json(guild);
        }
        catch (e) {
            console.log(e);
            res.json({msg: 'Invalid Guild ID', code: 101})
        }
    }
};