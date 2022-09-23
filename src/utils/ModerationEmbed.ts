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

import { MessageEmbed, User, MessageEmbedOptions } from 'discord.js';

export default class ModerationEmbed extends MessageEmbed {
	constructor(protected user: User, protected mod: User, options?: MessageEmbedOptions) {
		super({
			author: {
				name: user.tag,
				iconURL: user.displayAvatarURL()
			},
			...options
		});
		
		this.addField('Executor', `Tag: ${mod.tag}\nID: ${mod.id}`);

		this.setFooter({
			text: `${user.id}`
		});

		this.setTimestamp();
		
		this.setColor('#007bff');
	}

	public setReason(reason: string | null | undefined) {
		if (reason) {
			this.addField('Reason', reason);
		}
		else {
			this.addField('Reason', '*No reason provided*');
		}

		return this;
	}
}
