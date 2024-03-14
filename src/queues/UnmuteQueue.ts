/*
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

import { log, logError } from "../components/log/Logger";
import Queue from "../utils/Queue";

export default class UnmuteQueue extends Queue {
    async run(userId: string) {
        try {
            log("Unmuting user");

            const member =
                this.guild.members.cache.get(userId) ?? (await this.guild.members.fetch(userId));

            if (!member) throw new Error("Member is null | undefined");

            await this.client.infractionManager
                .removeMemberMute(member, {
                    guild: this.guild,
                    moderator: this.client.user!,
                    notifyUser: true,
                    reason: "*Your mute has expired*",
                    sendLog: true
                })
                .catch(logError);
        } catch (e) {
            logError(e);
        }
    }
}
