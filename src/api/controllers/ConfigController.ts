/**
 * This file is part of SudoBot.
 * 
 * Copyright (C) 2021-2022 OSN Inc.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by 
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License 
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { dot, object } from "dot-object";
import { body } from "express-validator";
import { z as zod } from "zod";
import KeyValuePair from "../../types/KeyValuePair";
import Controller from "../Controller";
import RequireAuth from "../middleware/RequireAuth";
import ValidatorError from "../middleware/ValidatorError";
import Request from "../Request";
import merge from 'ts-deepmerge';

export default class ConfigController extends Controller {
    globalMiddleware(): Function[] {
        return [RequireAuth, ValidatorError];
    }

    middleware(): KeyValuePair<Function[]> {
        return {
            update: [
                body(["config"]).isObject()
            ]
        };
    }

    private zodSchema(id: string) {
        const snowflake = zod.string().regex(/\d+/, { message: "The given value is not a Snowflake" });
        const config = this.client.config.props[id];

        const schema = zod.object({
            "prefix": zod.string().optional(),
            "debug": zod.boolean().optional(),
            "mute_role": snowflake.optional(),
            "gen_role": snowflake.optional(),
            "logging_channel": snowflake.optional(),
            "logging_channel_join_leave": snowflake.optional(),
            "mod_role": snowflake.optional(),
            "announcement_channel": snowflake.optional(),
            "admin": snowflake.optional(),
            "lockall": zod.array(zod.string()).optional(),
            "warn_notallowed": zod.boolean().optional(),
            "role_commands": zod.record(
                snowflake,
                zod.array(zod.string().min(1))
            ).optional().default({}),
            "autoclear": zod.object({
                "enabled": zod.boolean().optional(),
                "channels": zod.array(snowflake).optional().default(config.autoclear.channels)
            }).optional(),
            "verification": zod.object({
                "enabled": zod.boolean().optional(),
                "role": snowflake.optional()
            }).optional(),
            "welcomer": zod.object({
                "enabled": zod.boolean().optional(),
                "channel": snowflake.optional(),
                "message": zod.string().min(1).or(zod.null()).optional(),
                "randomize": zod.boolean().optional()
            }).optional(),
            "cooldown": zod.object({
                "enabled": zod.boolean().optional(),
                "global": zod.any().optional(),
                "cmds": zod.object({}).optional()
            }).optional(),
            "starboard": zod.object({
                "enabled": zod.boolean().optional(),
                "reactions": zod.number().int().optional(),
                "channel": snowflake.optional()
            }).optional(),
            "autorole": zod.object({
                "enabled": zod.boolean().optional(),
                "roles": zod.array(snowflake).optional().default(config.autorole.roles)
            }).optional(),
            "spam_filter": zod.object({
                "enabled": zod.boolean().optional(),
                "limit": zod.number().int().optional(),
                "time": zod.number().optional(),
                "diff": zod.number().optional(),
                "exclude": zod.array(snowflake).optional().default(config.spam_filter.exclude),
                "samelimit": zod.number().int().optional(),
                "unmute_in": zod.number().optional()
            }).optional(),
            "raid": zod.object({
                "enabled": zod.boolean().optional(),
                "max_joins": zod.number().int().optional(),
                "time": zod.number().optional(),
                "channels": zod.array(snowflake).optional().default(config.raid.channels),
                "exclude": zod.boolean().optional()
            }).optional(),
            "global_commands": zod.array(zod.string()).optional().default(config.global_commands),
            "filters": zod.object({
                "ignore_staff": zod.boolean().optional(),
                "chars_repeated": zod.number().int().optional(),
                "words_repeated": zod.number().int().optional(),
                "words": zod.array(zod.string()).optional().default(config.filters.words),
                "tokens": zod.array(zod.string()).optional().default(config.filters.tokens),
                "invite_message": zod.string().optional(),
                "words_excluded": zod.array(snowflake).optional().default(config.filters.words_excluded),
                "domain_excluded": zod.array(snowflake).optional().default(config.filters.domain_excluded),
                "invite_excluded": zod.array(snowflake).optional().default(config.filters.invite_excluded),
                "words_enabled": zod.boolean().optional(),
                "invite_enabled": zod.boolean().optional(),
                "domain_enabled": zod.boolean().optional(),
                "regex": zod.boolean().optional(),
                "file_mimes_excluded": zod.array(zod.string()).optional().default(config.filters.file_mimes_excluded),
                "file_types_excluded": zod.array(zod.string()).optional().default(config.filters.file_types_excluded),
                "domains": zod.array(zod.string()).optional().default(config.filters.domains),
                "regex_patterns": zod.array(zod.string()).optional().default(config.filters.regex_patterns),
                "rickrolls_enabled": zod.boolean().optional(),
                "pings": zod.number().int().optional()
            }).optional()
        });

        return schema;
    }

    public async index(request: Request) {
        const { id } = request.params;

        if (!request.user?.guilds.includes(id)) {
            return this.response({ error: "You don't have permission to access configuration of this guild." }, 403);
        }

        if (id === "global" || !this.client.config.props[id]) {
            return this.response({ error: "No configuration found for the given guild ID" }, 404);
        }

        return this.client.config.props[id];
    }

    public async update(request: Request) {
        const { id } = request.params;
        const { config: origconfig } = request.body;

        console.log(origconfig);        

        try {
            const currentConfigDotObject = this.client.config.props[id];
    
            console.log("Current config: ", currentConfigDotObject);

            const result = this.zodSchema(id).safeParse(object(origconfig));

            if (!result?.success) {
                return this.response({ error: "The data schema does not match.", error_type: 'validation', errors: result.error.errors }, 422);
            }

            const config = result.data;
            const newConfig = merge.withOptions({ mergeArrays: false }, currentConfigDotObject, config);
            const result2 = this.zodSchema(id).safeParse(newConfig);

            if (!result2?.success) {
                console.log(result2.error.errors);                
                return this.response({ error: 'Internal Server Error (500)', error_type: 'internal' }, 500);
            }

            console.log('Final', newConfig);
            this.client.config.props[id] = newConfig;
            this.client.config.write();       
            return { message: "Configuration updated", previous: dot(currentConfigDotObject), new: dot(this.client.config.props[id]) };     
        }
        catch (e) {
            console.log(e);
            return this.response({ error: 'Internal Server Error', error_type: 'internal' }, 500);
        }
    }

    public async update2(request: Request) {
        const { id } = request.params;
        const { config: origconfig } = request.body;

        console.log(origconfig);        

        try {
            const currentConfigDotObject = dot(this.client.config.props[id]);
            let newConfigDotObject = {...currentConfigDotObject};
    
            console.log("Current config: ", currentConfigDotObject);

            const result = this.zodSchema(id).safeParse(object({...origconfig}));

            if (!result?.success) {
                return this.response({ error: "The data schema does not match.", error_type: 'validation', errors: result.error.errors }, 422);
            }

            const config = result.data;

            console.log(config);            

            for (const key in config) {
                const configKey = key as keyof typeof config;
                const regexMatched = /(.+)\[\d+\]/g.test(configKey);
                
                if (typeof currentConfigDotObject[configKey] === 'undefined' && !regexMatched) {
                    console.log(configKey, config[configKey]);
                    
                    if (currentConfigDotObject[configKey] instanceof Array && config[configKey] instanceof Array) {
                        console.log('Array');                        
                    }
                    else
                        return this.response({ error: `The key '${configKey}' is not allowed` }, 422);
                }

                if (!regexMatched && config[configKey] !== null && config[configKey] !== null && typeof config[configKey] !== typeof currentConfigDotObject[configKey]) {
                    console.log(typeof config[configKey], typeof currentConfigDotObject[configKey]);    
                    
                    if (typeof currentConfigDotObject[configKey] === 'number' && typeof config[configKey] === 'string') {
                        const int = parseInt(config[configKey]!.toString());

                        if (int !== NaN) {
                            newConfigDotObject[configKey] = int;
                            console.log("Updating: ", configKey, config[configKey], newConfigDotObject[configKey]);
                            continue;
                        } 
                    }
                    
                    return this.response({ error: `The key '${configKey}' has incompatible value type '${config[configKey] === null ? 'null' : typeof config[configKey]}'` }, 422);
                }

                console.log("Updating: ", configKey, config[configKey], newConfigDotObject[configKey]);
            }

            const newObj = object({...newConfigDotObject});
            const configObj = object({...config});

            // console.log("Newobj", newObj);
            // console.log("Configobj", configObj);

            newConfigDotObject = merge.withOptions({ mergeArrays: false }, newObj, configObj);
            console.log("Output: ", newConfigDotObject);

            this.client.config.props[id] = newConfigDotObject;
            this.client.config.write();

            return { message: "Configuration updated", previous: currentConfigDotObject, new: dot(this.client.config.props[id]) };
        }
        catch (e) {
            console.log(e);
            return this.response({ error: 'Internal Server Error', error_type: 'internal' }, 500);
        }
    }
}