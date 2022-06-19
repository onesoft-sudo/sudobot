import { Request, Response } from "express";
import DiscordClient from "../../client/Client";
import auth from "../Auth";
import guildAuth from "../GuildAuth";
import { Route } from "../Router";
import { z } from 'zod';
import { isChannel, isRole } from "../Validator";

export default <Route> {
    path: '/config/misc/:guild',
    middleware: [guildAuth],
    async post(req: Request, res: Response) {
        console.log('log');
        
        const dataArray = await z.array(z.string());

        const Config = await z.object({
            prefix: z.string(),
            debug: z.boolean(),
            starboard: z.object({
                enabled: z.boolean(),
                reactions: z.number().int(),
                channel: z.string()
            }),
            autorole: z.object({
                enabled: z.boolean(),
                roles: dataArray
            }),
            warn_notallowed: z.boolean(),
            global_commands: dataArray,
            role_commands: z.any(),
        });

        console.log(req.body.data);

        if (!req.body.data || !Config.safeParse(req.body.data).success) {
            res.status(422).json({
                status: 422,
                message: "Unprocessable entity",
                trace: Config.safeParse(req.body.data)
            });

            return;
        }

        const { data: body } = req.body;        

        if (
            !await isChannel(body.starboard.channel, req.params.guild)
        ) {
            res.status(422).json({
                status: 422,
                message: "Invalid channels"
            });

            return;
        }

        for (const roleID of body.autorole.roles) {
            if (!await isRole(roleID, req.params.guild)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid roles"
                });

                return;
            }
        }

        for (const cmd of body.global_commands) {
            if (!DiscordClient.client.commands.has(cmd)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid command"
                });
    
                return;
            }
        }

        for (const roleID in body.role_commands) {
            if (!await isRole(roleID, req.params.guild)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid roles (2)"
                });

                return;
            }

            console.log(roleID, body.role_commands[roleID]);
        }

        const previous = {...DiscordClient.client.config.props[req.params.guild]};

        const current = {
            ...DiscordClient.client.config.props[req.params.guild],
            ...body
        };

        DiscordClient.client.config.props[req.params.guild] = current;
        DiscordClient.client.config.write();

        await res.json({
            previous,
            current,
            input: req.body
        });
    }
};