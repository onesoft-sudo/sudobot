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
        const currentConfigDotObject = dot(this.client.config.props[id]);
        const newConfigDotObject = {...currentConfigDotObject};
 
        console.log("Input: ", config);

        for (const configKey in config) {
            if (!(configKey in currentConfigDotObject)) {
                return { error: `The key '${configKey}' is not allowed` };
            }

            if (typeof config[configKey] !== typeof currentConfigDotObject[configKey] || (config[configKey] !== null && currentConfigDotObject[configKey] === null) || (config[configKey] === null && currentConfigDotObject[configKey] !== null)) {
                return { error: `The key '${configKey}' has incompatible value type '${config[configKey] === null ? 'null' : typeof config[configKey]}'` };
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