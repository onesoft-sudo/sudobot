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

import { userMention } from "@discordjs/builders";
import { Collection, Message } from "discord.js";
import DiscordClient from "../client/Client";
import StaffAway, { IStaffAway } from "../models/StaffAway";
import { emoji } from "../utils/Emoji";
import Service from "../utils/structures/Service";

export default class Utilities extends Service {
    typingInterval: NodeJS.Timer | null = null;
    typingTimeOut: NodeJS.Timeout | null = null;
    lastDeletedMessage?: Message;
    staffAwayList: IStaffAway[] = [];

    constructor(client: DiscordClient) {
        super(client);

        StaffAway.find({ enabled: true }).then(list => {
            this.staffAwayList = list;
        }).catch(console.error);
    }

    findStaffAway(guild: string, id: string, del = false) {
        let i = 0;

        for (const entry of this.staffAwayList) {
            if (entry.user === id && entry.guild_id === guild) {
                if (del) {
                    this.staffAwayList.splice(i, 1);
                }

                return entry;
            }

            i++;
        }

        return null;
    }

    async checkStaffAway(message: Message) {
        if (!message.author.bot && 
            this.client.config.props[message.guildId!].staffchannel_group && 
            message.channel.type === 'GUILD_TEXT' && 
            message.channel.parent?.id && 
            message.channel.parent?.id === this.client.config.props[message.guildId!].staffchannel_group && 
            message.member?.roles.cache.has(this.client.config.props[message.guildId!].mod_role)) {
            const user = message.mentions.repliedUser ?? message.mentions.users.first();

            const entry = user ? this.findStaffAway(message.guildId!, user.id) : null;
            const selfentry = this.findStaffAway(message.guildId!, message.author.id);

            if (selfentry) {
                this.client.utils.findStaffAway(message.guildId!, message.author.id, true);
                await selfentry.delete();
                await message.reply(`${emoji('check')} Welcome back, we've removed your away status.`);
            }
            else if (entry) {
                await message.reply({
                    content: `${userMention(entry.user)} has taken a break from moderating.`,
                    allowedMentions: {
                        users: []
                    }
                });
            }
        }
    }
}