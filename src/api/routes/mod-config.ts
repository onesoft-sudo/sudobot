import { Request, Response } from "express";
import DiscordClient from "../../client/Client";
import auth from "../Auth";
import guildAuth from "../GuildAuth";
import { Route } from "../Router";
import { z } from 'zod';
import { isChannel, isRole } from "../Validator";

export default <Route> {
    path: '/config/mod/:guild',
    middleware: [guildAuth],
    async post(req: Request, res: Response) {
        const dataArray = await z.array(z.string());

        const Config = await z.object({
            mute_role: z.string(),
            gen_role: z.string(),
            logging_channel: z.string(),
            logging_channel_join_leave: z.string(),
            mod_role: z.string(),
            announcement_channel: z.string(),
            autoclear: z.object({
                enabled: z.boolean(),
                channels: dataArray
            }),
            spam_filter: z.object({
                enabled: z.boolean(),
                limit: z.number().int(),
                time: z.number(),
                diff: z.number(),
                exclude: dataArray,
                samelimit: z.number().int(),
                unmute_in: z.number()
            }),
            raid: z.object({
                enabled: z.boolean(),
                max_joins: z.number().int(),
                time: z.number(),
                channels: dataArray,
                exclude: z.boolean()
            }),
            lockall: dataArray,
            // warn_notallowed: z.boolean(),
            // global_commands: dataArray,
            // role_commands: z.any(),
            filters: z.object({
                ignore_staff: z.boolean(),
                words_enabled: z.boolean(),
                invite_enabled: z.boolean(),
                regex: z.boolean(),
                chars_repeated: z.number().int(),
                words_repeated: z.number().int(),
                words: dataArray,
                invite_message: z.string(),
                words_excluded: dataArray,
                invite_excluded: dataArray,
                file_mimes_excluded: dataArray,
                file_types_excluded: dataArray
            })
        });

        console.log(req.body.data);        
        const parsed = Config.safeParse(req.body.data);

        if (!req.body.data || !parsed.success) {
            console.log(parsed);
            
            res.status(422).json({
                status: 422,
                message: "Unprocessable entity"
            });

            return;
        }

        const { data: body } = req.body;      

        if (
            !(await isRole(body.mod_role, req.params.guild)) ||
            !(await isRole(body.gen_role, req.params.guild)) ||
            !(await isRole(body.mute_role, req.params.guild))
        ) {
            res.status(422).json({
                status: 422,
                message: "Invalid roles"
            });

            return;
        }

        // for (const roleID in body.role_commands) {
        //     if (!await isRole(roleID, req.params.guild)) {
        //         res.status(422).json({
        //             status: 422,
        //             message: "Invalid roles (2)"
        //         });

        //         return;
        //     }
        // }

        await console.log(body.logging_channel, await isChannel(body.logging_channel, req.params.guild));
        

        if (
            !await isChannel(body.logging_channel, req.params.guild) ||
            !await isChannel(body.logging_channel_join_leave, req.params.guild) ||
            !await isChannel(body.announcement_channel, req.params.guild)
        ) {
            res.status(422).json({
                status: 422,
                message: "Invalid channels"
            });

            return;
        }
        
        const { spam_filter, raid, filters, autoclear } = body;

        console.log(autoclear);        

        for (const id of body.spam_filter.exclude) {
            if (!await isChannel(id, req.params.guild)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid channels (2)"
                });
    
                return;
            }
        }

        for (const id of raid.channels) {
            if (!await isChannel(id, req.params.guild)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid channels (3)"
                });
    
                return;
            }
        }

        for (const id of body.lockall) {
            if (!await isChannel(id, req.params.guild)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid channels (4)"
                });
    
                return;
            }
        }

        for (const id of filters.words_excluded) {
            if (!await isChannel(id, req.params.guild)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid channels (5)"
                });
    
                return;
            }
        }

        for (const id of filters.invite_excluded) {
            if (!await isChannel(id, req.params.guild)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid channels (6)"
                });
    
                return;
            }
        }

        for (const id of autoclear.channels) {
            if (!await isChannel(id, req.params.guild)) {
                res.status(422).json({
                    status: 422,
                    message: "Invalid channels (7)"
                });
    
                return;
            }
        }

        // for (const cmd of body.global_commands) {
        //     if (!DiscordClient.client.commands.has(cmd)) {
        //         res.status(422).json({
        //             status: 422,
        //             message: "Invalid command"
        //         });
    
        //         return;
        //     }
        // }

        const previous = {...DiscordClient.client.config.props[req.params.guild]};

        const current = {
            ...DiscordClient.client.config.props[req.params.guild],
            mute_role: body.mute_role,
            gen_role: body.gen_role,
            logging_channel: body.logging_channel,
            logging_channel_join_leave: body.logging_channel_join_leave,
            mod_role: body.mod_role,
            announcement_channel: body.announcement_channel,
            autoclear: {
                enabled: autoclear.enabled,
                channels: autoclear.channels
            },
            spam_filter: {
                enabled: spam_filter.enabled,
                limit: parseInt(spam_filter.limit),
                time: parseInt(spam_filter.time),
                diff: parseInt(spam_filter.diff),
                exclude: spam_filter.exclude,
                samelimit: parseInt(spam_filter.samelimit),
                unmute_in: spam_filter.unmute_in
            },
            raid: {
                enabled: raid.enabled,
                max_joins: parseInt(raid.max_joins),
                time: raid.time,
                channels: raid.channels,
                exclude: raid.exclude
            },
            lockall: body.lockall,
            // warn_notallowed: body.warn_notallowed,
            // global_commands: body.global_commands,
            // role_commands: body.role_commands,
            filters: {
                ...filters,
                chars_repeated: parseInt(filters.chars_repeated),
                words_repeated: parseInt(filters.words_repeated),
            }
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