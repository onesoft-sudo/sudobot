import Controller from "../Controller";
import { Path } from "../Server";

export default class MainController extends Controller {
    @Path("/")
    public async index() {
        return {
            message: "API server is up.",
        };
    }
}
