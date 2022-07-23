import { MessageEmbed, User, MessageEmbedOptions } from 'discord.js';

export class ModerationEmbed extends MessageEmbed {
	constructor(protected user: User, protected mod: User, options?: MessageEmbedOptions) {
		super({
			author: {
				name: user.tag,
				iconURL: user.displayAvatarURL()
			},
			...options
		});
		
		this.addField('Executor', [
			`Tag: ${mod.tag}`,
			`ID: ${mod.id}`
		]);

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
	}
}
