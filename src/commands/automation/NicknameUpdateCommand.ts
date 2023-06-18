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

import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import { Message } from 'discord.js';
import CommandOptions from '../../types/CommandOptions';

export default class NicknameUpdateCommand extends BaseCommand {
    name = "nicknameupdate";
    group = "automation";
    aliases = ["nupdate", "nickset", "nickupdate"];

    async run(client: DiscordClient, message: Message, options: CommandOptions) {
        const name = message.member!.nickname;
        
        if (!name) {
            await message.reply(":x: You don't have a nickname set.");
            return;
        }

        if (!/\d+( +)day(s?)$/ig.test(name)) {
            await message.reply(":x: You don't have a __valid__ nickname set.");
            return;
        }

        const splitted = name.split(/\s+/);
        const days = parseInt(splitted[splitted.length - 2]) as number;

        if (days >= 2)
            splitted[splitted.length - 2] = `${days - 1}`;
        else if (days === 1) {
            splitted[splitted.length - 2] = 'Tomorrow';
            splitted.pop();
        }
        else {
            splitted[splitted.length - 2] = 'Today';
            splitted.pop();
        }

        message.member!.setNickname(splitted.join(" ")).then(() => message.channel.send("Successfully updated your nickname.")).catch(e => {
            console.log(e);
            message.channel.send("Failed to update your nickname.");
        });
    }
}
