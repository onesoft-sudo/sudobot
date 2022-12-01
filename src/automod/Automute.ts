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

import { GuildMember } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import Service from "../utils/structures/Service";

export default class Automute extends Service {
    MuteRecord: typeof import("../models/MuteRecord").default;

    constructor(client: DiscordClient) {
        super(client);
        this.MuteRecord = require("../models/MuteRecord").default;
    }

    public async mute(member: GuildMember) {
        await member.roles.add(this.client.config.props[member.guild.id].mute_role);
    }

    public async onMemberJoin(member: GuildMember) {
        const { MuteRecord } = this;
        const muteRecord = await MuteRecord.findOne({
            user_id: member.user.id,
            guild_id: member.guild.id
        });

        if (!muteRecord) {
            return true;
        }

        await this.mute(member);

        this.client.logger.loggingChannel(member.guild.id)?.send({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL(),
                    },
                    description: 'This user had left the server when they were muted. They\'ve been muted again.',
                    color: 'GOLD',
                    footer: { text: 'Auto Mute' }
                })
                .setTimestamp()
            ]
        });

        await muteRecord.delete();
        return false;
    }

    public async onMemberLeave(member: GuildMember) {
        const { MuteRecord } = this;

        if (!member.roles.cache.has(this.client.config.props[member.guild.id].mute_role)) {
            return;
        }

        const muteRecord = await MuteRecord.findOne({
            user_id: member.user.id,
            guild_id: member.guild.id
        });

        if (!muteRecord) {
            await MuteRecord.create({
                user_id: member.user.id,
                guild_id: member.guild.id,
                createdAt: new Date()
            });
        }
    }
}