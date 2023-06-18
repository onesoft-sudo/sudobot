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

import { Guild, GuildMember, Invite } from "discord.js";
import Service from "../utils/structures/Service";

export default class InviteTracker extends Service {
    invites: {
        [guildID: string]: {
            [code: string]: number
        }
    } = {};

    async onInviteCreate(invite: Invite) {
        console.log("added");

        if (!invite.guild) {
            console.log("No guild");
            return;
        }

        if (!this.client.config.props[invite.guild.id].invite_tracking?.enabled) {
            return;
        }

        if (!invite.uses) {
            console.log("No uses");
            return;
        }

        if (!this.invites[invite.guild.id]) {
            this.invites[invite.guild.id] = {};
        }

        this.invites[invite.guild.id][invite.code] = invite.uses;
    }

    async refreshInvites(guild: Guild) {
        console.log("Refresh");

        if (!this.client.config.props[guild.id].invite_tracking?.enabled) {
            return;
        }

        const invites = await guild.invites.fetch();

        for (const invite of invites.values()) {
            if (!invite.uses) {
                console.log("No uses");
                continue;
            }

            if (!this.invites[guild.id]) {
                this.invites[guild.id] = {};
            }

            this.invites[guild.id][invite.code] = invite.uses;
        }
    }

    async onInviteDelete(invite: Invite) {
        if (!invite.guild) {
            console.log("No guild");
            return;
        }

        if (!this.client.config.props[invite.guild.id].invite_tracking?.enabled) {
            return;
        }

        delete this.invites[invite.guild.id][invite.code];
    }

    async getInviteInfo(member: GuildMember) {
        if (!this.client.config.props[member.guild.id].invite_tracking?.enabled) {
            return null;
        }

        const newInvites = await member.guild.invites.fetch();

        if (!this.invites[member.guild.id]) {
            this.invites[member.guild.id] = {};
        }
        
        for (const newInvite of newInvites.values()) {
            if ((newInvite.uses ?? 0) > this.invites[member.guild.id][newInvite.code]) {
                return newInvite;
            }
        }

        this.invites[member.guild.id] = {};

        for (const newInvite of newInvites.values()) {
            if (!newInvite.uses) {
                console.log("No uses");
                continue;
            }

            this.invites[member.guild.id][newInvite.code] = newInvite.uses;
        }

        return null;
    }
}
