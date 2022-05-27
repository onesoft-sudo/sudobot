import { Collection, Guild, OAuth2Guild } from "discord.js";
import { Request, Response } from "express";
import DiscordClient from "../../client/Client";
import auth from "../Auth";
import guildAuth from "../GuildAuth";
import { Route } from "../Router";

export default <Route> {
    path: '/guilds',
    async post(req: Request, res: Response) {
        let guilds: any;

        if (!req.body.guilds || !(req.body.guilds instanceof Array)) {
            res.json({});
            
            return;
        }

        for await (const id of req.body.guilds) {
            console.log(id);
            guilds = await DiscordClient.client.guilds.fetch(id);
        }

        console.log(guilds);
        
        await res.json({
            guilds: guilds.map(({ id, name, ownerId, iconURL }: any) => {
                return {
                    id,
                    name, 
                    ownerId,
                    iconURL
                }
            })
        });
    }
};