import { Request, Response } from "express";
import DiscordClient from "../../client/Client";
import UnverifiedMember from "../../models/UnverifiedMember";
import auth from "../Auth";
import guildAuth from "../GuildAuth";
import { Route } from "../Router";

export default <Route> {
    path: '/verification/:guild',
    middleware: [guildAuth],
    async post(req: Request, res: Response) {
        await res.json(await UnverifiedMember.findAll({
            where: {
                guild_id: req.params.guild
            }
        }));
    }
};