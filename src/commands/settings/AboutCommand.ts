import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class AboutCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    metadata = require('../../../package.json');

    constructor() {
        super('about', 'settings', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        await message.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({ iconURL: client.user?.displayAvatarURL(), name: "SudoBot" })
                .setDescription(`
                    A free and open source Discord moderation bot, specially created for **The Everything Server**.

                    Copyright (C) ${new Date().getFullYear()} OSN Inc.
                    This bot comes with ABSOLUTELY NO WARRANTY.
                    This is free software, and you are welcome to redistribute it under certain conditions.
                    See the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html) for more detailed information.
                `)
                .addFields({
                    name: 'Version',
                    value: this.metadata.version,
                    inline: true
                }, {
                    name: 'Source Code',
                    value: `[GitHub](${this.metadata.repository.url})`,
                    inline: true,
                }, {
                    name: 'Licensed Under',
                    value: `[GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html)`,
                    inline: true
                })
                .addFields({
                    name: "Author",
                    value: `[${this.metadata.author.name}](${this.metadata.author.url})`,
                    inline: true
                }, {
                    name: 'Support',
                    value: this.metadata.author.email,
                    inline: true
                })
                .setFooter({
                    text: `Copyright © OSN Inc 2022. All rights reserved.`
                })
            ]
        });
    }
}