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

import Queue from "../utils/structures/Queue";
import { MessageEmbed } from "discord.js";
import { formatDistanceToNowStrict } from 'date-fns';

export default class ReminderQueue extends Queue {
    async execute({ userID, description, createdAt }: { [key: string]: string }): Promise<any> {     
        try {
            const user = await this.client.users.fetch(userID);

            if (user) {
                user.send({
                    embeds: [
                        new MessageEmbed({
                            title: "Reminder Notification",
                            description,
                            color: 0x007bff,
                            footer: {
                                text: `This reminder was created ${formatDistanceToNowStrict(new Date(createdAt), { addSuffix: true })}`
                            }
                        })
                        .setTimestamp()
                    ]
                }).catch(console.error);
            }
            else {
                throw new Error();
            }
        }
        catch (e) {
            console.log(e);   
        }
    }
}