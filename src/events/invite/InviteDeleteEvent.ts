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

import { Invite } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class InviteDeleteEvent extends BaseEvent {
    constructor() {
        super('inviteDelete');
    }

    async run(client: DiscordClient, invite: Invite) {
        await client.inviteTracker.onInviteDelete(invite);
    }
}