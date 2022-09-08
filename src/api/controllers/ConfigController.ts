import Controller from "../Controller";
import RequireAuth from "../middleware/RequireAuth";
import Request from "../Request";

export default class ConfigController extends Controller {
    globalMiddleware(): Function[] {
        return [RequireAuth];
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
        
    }
}