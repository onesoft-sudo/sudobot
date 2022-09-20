import ConfigController from "../controllers/ConfigController";
import InfoController from "../controllers/InfoController";
import MainController from "../controllers/MainController";
import UserController from "../controllers/UserController";
import Router from "../Router";

Router.get("/", [MainController, "index"]);

Router.get("/config/:id", [ConfigController, "index"]);
Router.put("/config/:id", [ConfigController, "update"]);
Router.patch("/config/:id", [ConfigController, "update"]);

Router.resource("/users", UserController);
Router.post("/login", [UserController, "login"]);

Router.get("/info/:id/channels", [InfoController, "indexChannels"]);
Router.get("/info/:id/roles", [InfoController, "indexRoles"]);