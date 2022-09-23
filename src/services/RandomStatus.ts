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

import { ExcludeEnum, PresenceStatusData } from "discord.js";
import { ActivityTypes } from "discord.js/typings/enums";
import Service from "../utils/structures/Service";
import { random } from "../utils/util";

export default class RandomStatus extends Service {
    async update(status?: PresenceStatusData) {
        status ??= random(['dnd', 'idle', 'online'] as PresenceStatusData[]);
        console.log(status);
        
        await this.client.user?.setActivity({
            type: this.client.config.props.status?.type ?? 'WATCHING',
            name: this.client.config.props.status?.name ?? 'over the server'
        });

        await this.client.user?.setStatus(status!);
    }

    async config(name?: string, type?: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>) {
        this.client.config.props.status ??= {};
        this.client.config.props.status.type = type ?? 'WATCHING';
        this.client.config.props.status.name = name ?? 'over the server';
        this.client.config.write();
    }
}