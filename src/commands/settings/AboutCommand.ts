import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class AboutCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    version: string;

    constructor() {
        super('about', 'settings', []);
        const { version } = require('../../../package.json');
        this.version = version;
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        await message.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('SudoBot')
                .setDescription('A free and open source discord moderation bot, specially created for **The Everything Server**.')
                .addField('Version', this.version)
                .addField('Support', 'rakinar2@gmail.com')
                .setFooter({
                    text: 'Copyright © Ar Rakin 2022, all rights reserved'
                })
            ]
        });
    }
}