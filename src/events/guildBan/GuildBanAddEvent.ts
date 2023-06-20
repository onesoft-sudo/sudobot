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

import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildBan } from 'discord.js';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import { isDisabledServer } from '../../utils/util';

export default class GuildBanAddEvent extends BaseEvent {
    constructor() {
        super('guildBanAdd');
    }
    
    async run(client: DiscordClient, ban: GuildBan) {
        if (isDisabledServer(ban.guild.id)) 
            return;

        setTimeout(async () => {
            const logs = (await ban.guild.fetchAuditLogs({
                limit: 1,
                type: 'MEMBER_BAN_ADD',
            })).entries.first();

            console.log(logs?.executor);

            if (logs?.executor?.id && logs?.executor?.id !== client.user!.id) {
                const { id } = await Punishment.create({
                    type: PunishmentType.BAN,
                    user_id: ban.user.id,
                    guild_id: ban.guild!.id,
                    mod_id: logs?.executor?.id,
                    mod_tag: logs?.executor?.tag ?? 'Unknown',
                    reason: ban.reason ?? undefined
                });

                await client.logger.onGuildBanAdd(ban, undefined, id);
            }
        }, 3500);
    }
}