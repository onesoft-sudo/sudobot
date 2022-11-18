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
        const config = this.client.config.props[id];
        return this.client.config.schema(config);
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

                        if (!isNaN(int)) {
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
