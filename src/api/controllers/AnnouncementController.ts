/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { Action } from "../../decorators/Action";
import Controller from "../Controller";
import Request from "../Request";

export default class AnnouncementController extends Controller {
    @Action("GET", "/announcements")
    public async index(request: Request) {
        return {
            announcements: [
                {
                    from: "The Developers",
                    createdAt: new Date("2023-08-07T23:35:00+06:00"),
                    title: "Help us make the bot even better!",
                    description:
                        "We're adding new features continuously, want to know more about what we plan to implement? Let's discuss what will be the best!",
                    buttons: [
                        {
                            name: "Contact Us",
                            url: "{SUPPORT_EMAIL_ADDRESS}"
                        }
                    ]
                }
            ]
        };
    }
}
