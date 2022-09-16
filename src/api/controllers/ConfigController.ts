import { dot, object } from "dot-object";
import { body } from "express-validator";
import { z as zod, ZodSchema } from "zod";
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

    private zodSchema() {
        const snowflake = zod.string().regex(/\d+/, { message: "The given value is not a Snowflake" });

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
            ).optional(),
            "autoclear": zod.object({
                "enabled": zod.boolean().optional(),
                "channels": zod.array(snowflake).optional()
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
                "roles": zod.array(snowflake).optional()
            }).optional(),
            "spam_filter": zod.object({
                "enabled": zod.boolean().optional(),
                "limit": zod.number().int().optional(),
                "time": zod.number().optional(),
                "diff": zod.number().optional(),
                "exclude": zod.array(snowflake).optional(),
                "samelimit": zod.number().int().optional(),
                "unmute_in": zod.number().optional()
            }).optional(),
            "raid": zod.object({
                "enabled": zod.boolean().optional(),
                "max_joins": zod.number().int().optional(),
                "time": zod.number().optional(),
                "channels": zod.array(snowflake).optional(),
                "exclude": zod.boolean().optional()
            }).optional(),
            "global_commands": zod.array(zod.string()).optional(),
            "filters": zod.object({
                "ignore_staff": zod.boolean().optional(),
                "chars_repeated": zod.number().int().optional(),
                "words_repeated": zod.number().int().optional(),
                "words": zod.array(zod.string()).optional(),
                "tokens": zod.array(zod.string()).optional(),
                "invite_message": zod.string().optional(),
                "words_excluded": zod.array(snowflake).optional(),
                "domain_excluded": zod.array(snowflake).optional(),
                "invite_excluded": zod.array(snowflake).optional(),
                "words_enabled": zod.boolean().optional(),
                "invite_enabled": zod.boolean().optional(),
                "domain_enabled": zod.boolean().optional(),
                "regex": zod.boolean().optional(),
                "file_mimes_excluded": zod.array(zod.string()).optional(),
                "file_types_excluded": zod.array(zod.string()).optional(),
                "domains": zod.array(zod.string()).optional(),
                "regex_patterns": zod.array(zod.string()).optional(),
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
        const { config } = request.body;

        console.log(config);        

        try {
            const currentConfigDotObject = dot(this.client.config.props[id]);
            let newConfigDotObject = {...currentConfigDotObject};
    
            console.log("Input: ", config);

            const result = this.zodSchema().safeParse(object({...config}));

            if (!result?.success) {
                return this.response({ error: "The data schema does not match.", error_type: 'validation', errors: result.error.errors }, 422);
            }

            for (const configKey in config) {
                const regexMatched = /(.+)\[\d+\]/g.test(configKey);
                
                if (typeof currentConfigDotObject[configKey] === 'undefined' && !regexMatched) {
                    return this.response({ error: `The key '${configKey}' is not allowed` }, 422);
                }

                if (!regexMatched && config[configKey] !== null && config[configKey] !== null && typeof config[configKey] !== typeof currentConfigDotObject[configKey]) {
                    console.log(typeof config[configKey], typeof currentConfigDotObject[configKey]);    
                    
                    if (typeof currentConfigDotObject[configKey] === 'number' && typeof config[configKey] === 'string') {
                        const int = parseInt(config[configKey]);

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


            newConfigDotObject = merge.withOptions({ mergeArrays: false }, object({...newConfigDotObject}), object({...config}));
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