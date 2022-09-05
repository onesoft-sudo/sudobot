import ConfigController from "../controllers/ConfigController";
import MainController from "../controllers/MainController";
import UserController from "../controllers/UserController";
import Router from "../Router";

Router.get("/", [MainController, "index"]);
Router.resource("/config", ConfigController, { post: false, del: false });
Router.resource("/user", UserController);
