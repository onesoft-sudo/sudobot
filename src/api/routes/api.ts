import ConfigController from "../controllers/ConfigController";
import MainController from "../controllers/MainController";
import UserController from "../controllers/UserController";
import Router from "../Router";

Router.get("/", [MainController, "index"]);

Router.get("/config/:id", [ConfigController, "index"]);
Router.put("/config/:id", [ConfigController, "update"]);
Router.patch("/config/:id", [ConfigController, "update"]);

Router.resource("/users", UserController);
Router.post("/login", [UserController, "login"]);
