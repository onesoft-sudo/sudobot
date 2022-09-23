/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

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
Router.get("/systeminfo/commands", [InfoController, "indexCommands"]);