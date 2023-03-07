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

import { CommandInteraction, Message, Util } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { formatDuration, intervalToDuration } from 'date-fns';

export default class AFKCommand extends BaseCommand {
    supportsInteractions = true;
    cooldownMap = new Map<string, [Date, number, NodeJS.Timeout]>();

    constructor() {
        super('afk', 'utils', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const entry = this.cooldownMap.get(message.member!.user.id);

        if (entry) {
            if (entry[1] > 5) {
                if (message instanceof Message) {
                    message.react('⏰').catch(console.error);
                }
                else {
                    message.reply({
                        content: `Please try again in ${formatDuration(intervalToDuration({
                            start: new Date(),
                            end: new Date(entry[0].getTime() + (10 * 60 * 1000))
                        }))}`,
                        ephemeral: true
                    }).catch(console.error);
                }

                return;
            }
            else {
                this.cooldownMap.set(message.member!.user.id, [entry[0], entry[1] + 1, entry[2]]);
            }
        }
        else {
            this.cooldownMap.set(message.member!.user.id, [new Date(), 0, setTimeout(() => {
                this.cooldownMap.delete(message.member!.user.id);
            }, 10 * 60 * 1000)]);
        }

        let status = options.isInteraction ? options.options.getString("reason") ?? undefined : options.args.join(" ");

        if (message instanceof Message) {
            status = status?.trim() === '' ? undefined : status;
        }
        
        if (status && status.replace(/<\w+\:\d+>/gi, '').length > 200) {
            message.reply(":x: AFK reason is too long. Make sure it has less than 100 characters.").catch(console.error);
            return;
        }

        await client.afkEngine.toggle(message, true, status);
    }
}
