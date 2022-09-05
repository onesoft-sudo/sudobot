import MainController from "../controllers/MainController";
import Router from "../Router";

Router.get("/", [MainController, "index"]);
Router.get("/system", [MainController, "system"]);