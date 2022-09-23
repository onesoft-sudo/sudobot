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
import { Request } from "express";
import MessageEmbed from "../client/MessageEmbed";
import Service from "../utils/structures/Service";

export default class Verification extends Service {
    async success(member: GuildMember, req: Request) {        
        await member.roles.remove(this.client.config.props[member.guild.id].verification.role);

		try {
	        await member.send({
	            embeds: [
	                new MessageEmbed({
	                    author: {
	                        name: member.guild.name,
	                        iconURL: member.guild.iconURL() ?? undefined,
	                    },
	                    title: "Thanks for verifying!",
	                    description: "The verification was completed successfully!",
	                    timestamp: new Date()
	                })
	            ],
	        });
	    }
	    catch (e) {
	    	console.log(e);
	    }

        const { default: UnverifiedMember } = await import('../models/UnverifiedMember');

        const data = await UnverifiedMember.findOne({
			guild_id: member.guild.id,
			user_id: member.id,
			status: 'pending'
        });

        await data?.set('status', 'done');
        await data?.set('ip', req.ip);
        await data?.set('user_agent', req.get('User-Agent'));
        await data?.save();
    }

    async start(member: GuildMember) {
        const { default: UnverifiedMember } = await import('../models/UnverifiedMember');

        await UnverifiedMember.create({
            guild_id: member.guild.id,
            user_id: member.id,
            status: 'pending',
			createdAt: new Date()
        });

        await member.roles.add(this.client.config.props[member.guild.id].verification.role);

        const url = `${this.client.config.props.global.cp_host}/challenge/v1/verify/?guild_id=${member.guild.id}`;

		try {
	        await member.send({
	            embeds: [
	                new MessageEmbed({
	                    author: {
	                        name: member.guild.name,
	                        iconURL: member.guild.iconURL() ?? undefined,
	                    },
	                    title: "Verification Required!",
	                    description: `Hey ${member.nickname ?? member.user.username}, the server **${member.guild.name}** requires verification!\nTo verify yourself, simply go to the verification URL given below and you might be asked to solve some captcha.\n\nHave a nice day,\n*${member.guild.name} Staff*`,
	                    timestamp: new Date(),
	                    fields: [
	                        {
	                            name: "Verification URL",
	                            value: url
	                        }
	                    ],
	                    url
	                })
	            ]
	        });
        }
        catch (e) {
        	console.log(e);
        }
    }
}
