import axios from "axios";
import { Request, Response } from "express";
import { json } from "stream/consumers";
import DiscordClient from "../../client/Client";
import UnverifiedMember from "../../models/UnverifiedMember";
import auth from "../Auth";
import guildAuth from "../GuildAuth";
import { Route } from "../Router";

export default <Route> {
    path: '/recaptcha/:guild/:token/:user_id',
    async get(req: Request, res: Response) {
        if (!req.params.guild)
            return res.json({ msg: 'Guild ID is required', code: 100 });
        
        if (!req.params.token)
            return res.json({ msg: 'Recaptcha token is required', code: 101 });
        
        if (!req.params.user_id)
            return res.json({ msg: 'User ID is required', code: 103 });
        
        let guild;

        try {
            guild = await DiscordClient.client.guilds.fetch(req.params.guild);

            if (!DiscordClient.client.config.props[guild.id])
                throw new Error();
        }
        catch (e) {
            console.log(e);
            res.json({ msg: 'Invalid Guild ID', code: 102 });
            return;
        }

        if (guild) {
            console.log(process.env.RECAPTCHA_TOKEN);
            
            const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?response=${decodeURIComponent(req.params.token)}&secret=${decodeURIComponent(process.env.RECAPTCHA_TOKEN!)}&remoteip=${req.ip}`);

            if (response.data.success) {
                const memberData = await UnverifiedMember.findOne({
                    where: {
                        user_id: req.params.user_id,
                        guild_id: req.params.guild
                    }
                });             

                if (!memberData) {
                    return await res.json({
                        msg: "No verification required",
                        code: 104
                    });
                }

                try {
                    const user = await guild.members.fetch(memberData.get().user_id);

                    if (!user)
                        throw new Error();
                    
                    await DiscordClient.client.verification.success(user);

                    return await res.json({
                        google: response.data,
                        guild,
                        member: user
                    });
                }
                catch (e) {
                    console.log(e);
                    
                    return await res.json({
                        msg: "No such member",
                        code: 105
                    });
                }
            }
            else {
                res.json({
                    google: response.data,
                });
            }
        }
    }
};