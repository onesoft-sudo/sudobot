import { dot, object } from "dot-object";
import { body } from "express-validator";
import KeyValuePair from "../../types/KeyValuePair";
import Controller from "../Controller";
import RequireAuth from "../middleware/RequireAuth";
import ValidatorError from "../middleware/ValidatorError";
import Request from "../Request";

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

        const currentConfigDotObject = dot(this.client.config.props[id]);
        const newConfigDotObject = {...currentConfigDotObject};
 
        console.log("Input: ", config);

        for (const configKey in config) {
            if (typeof currentConfigDotObject[configKey] === 'undefined') {
                return this.response({ error: `The key '${configKey}' is not allowed` }, 422);
            }

            if (config[configKey] !== null && config[configKey] !== null && typeof config[configKey] !== typeof currentConfigDotObject[configKey]) {
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

            newConfigDotObject[configKey] = config[configKey];
            console.log("Updating: ", configKey, config[configKey], newConfigDotObject[configKey]);
        }

        console.log("Output: ", newConfigDotObject);

        this.client.config.props[id] = object({...newConfigDotObject});
        this.client.config.write();

        return { message: "Configuration updated", previous: currentConfigDotObject, new: newConfigDotObject };
    }
}