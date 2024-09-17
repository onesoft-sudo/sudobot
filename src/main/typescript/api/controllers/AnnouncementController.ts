/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { Action } from "@framework/api/decorators/Action";
import Controller from "@framework/api/http/Controller";

class AnnouncementController extends Controller {
    @Action("GET", "/announcements/latest")
    public async getLatest() {
        return {
            title: "Announcement",
            content:
                "We're here to announce that SudoBot 10.x \"Delicious Donut\" is now available! 🎉🍰🎉\n\nThis release adds a bunch of new features, and performance fixes. We're open to any questions or suggestions as always, feel free to contact us anytime! We hope you have a great day.",
            from: "rakinar2",
            timestamp: 1725385295628
        };
    }
}

export default AnnouncementController;
