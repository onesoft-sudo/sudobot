import ConfigController from "../controllers/ConfigController";
import MainController from "../controllers/MainController";
import UserController from "../controllers/UserController";
import Router from "../Router";

Router.get("/", [MainController, "index"]);

Router.get("/config/:id", [ConfigController, "index"]);

Router.resource("/users", UserController);
Router.post("/login", [UserController, "login"]);
