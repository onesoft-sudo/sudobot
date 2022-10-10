import Punishment from "../../models/Punishment";
import Controller from "../Controller";
import RequireAuth from "../middleware/RequireAuth";
import ValidatorError from "../middleware/ValidatorError";
import Request from "../Request";

export default class HistoryController extends Controller {
    globalMiddleware(): Function[] {
        return [RequireAuth, ValidatorError];
    }

    async index(request: Request) {
        if (!request.user?.guilds.includes(request.params.id)) {
            return this.response({ error: "You don't have permission to access history of this guild." }, 403);
        }

        const queryLimit = parseInt((request.query.limit as string) ?? '0');
        const limit = request.query.limit ? (queryLimit < 1 || queryLimit > 20 ? 20 : queryLimit) : 20;
        const maxPages = Math.ceil((await Punishment.count({ guild_id: request.params.id })) / limit);
        const page = request.query.page ? parseInt(request.query.page as string) : 1;

        if (maxPages < page) {
            return this.response({ error: "That page does not exist" }, 404);
        } 

        const offset = (page - 1) * limit;

        const data = (await Punishment.find({ guild_id: request.params.id }).skip(offset).limit(limit));
        const newData = [];

        for await (const row of data) {
            let user = { id: row.user_id };

            try {
                user = this.client.users.cache.get(row.user_id) || await this.client.users.fetch(row.user_id);
            }
            catch (e) {
                console.log(e);
            } 

            const newRow = {
                ...(row.toJSON()),
                user
            };

            newData.push(newRow);
        }

        return newData;
    }
}