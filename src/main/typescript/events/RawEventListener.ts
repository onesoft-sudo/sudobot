/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { Inject } from "@framework/container/Inject";
import EventListener from "@framework/events/EventListener";
import { Events } from "@framework/types/ClientEvents";
import type ReactionRoleService from "@main/services/ReactionRoleService";
import type { RawMessageReactionData } from "@main/services/ReactionRoleService";

class RawEventListener extends EventListener<Events.Raw> {
    public override readonly name = Events.Raw;

    @Inject("reactionRoleService")
    protected readonly reactionRoleService!: ReactionRoleService;

    public override async execute(data: { t: string; d: unknown }): Promise<void> {
        await this.reactionRoleService.onRaw(data as RawMessageReactionData);
    }
}

export default RawEventListener;
