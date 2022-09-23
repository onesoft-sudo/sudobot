
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

import { ColorResolvable, CommandInteraction, Util } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class EmbedSendCommand extends BaseCommand {
    supportsInteractions: boolean = false;
    supportsLegacy: boolean = false;
    supportsContextMenu: boolean = false;    

    constructor() {
        super('embed__send', 'automation', []);
    }

    async run(client: DiscordClient, interaction: CommandInteraction, options: InteractionOptions) {
        const getString = (field: string): string | undefined => {
            return options.options.getString(field) ?? undefined;
        };

        const author = {
            name: getString('author_name'),
            iconURL: getString('author_iconurl'),
        };

        const footer = {
            text: getString('footer_text'),
            iconURL: getString('footer_iconurl'),
        };

        if (getString('color') && (!Util.resolveColor(getString('color') as ColorResolvable) || Util.resolveColor(getString('color') as ColorResolvable) === NaN)) {
            await interaction.reply({ content: "Invalid color given.", ephemeral: true });
            return;
        }

        const embed = new MessageEmbed({
            author: author.name ? author : undefined,
            title: getString('title'),
            description: getString('description'),
            thumbnail: getString('thumbnail') ? {
                url: getString('thumbnail')
            } : undefined,
            image: getString('image') ? {
                url: getString('image')
            } : undefined,
            video: getString('video') ? {
                url: getString('video')
            } : undefined,
            footer: footer.text ? footer : undefined,
            color: (getString('color') ?? '#007bff') as ColorResolvable,
            timestamp: getString('timestamp') ? (getString('timestamp') === 'current' ? new Date() : new Date(getString('timestamp')!)) : undefined,
            fields: getString('fields') ? getString('fields')!.trim().split(',').map(fieldData => {
                const [name, value] = fieldData.trim().split(':');

                return {
                    name: name.trim(),
                    value: value.trim(),
                };
            }) : [],
            url: getString('url'),
        });

        try {
            await interaction.channel?.send({
                embeds: [embed]
            });

            await interaction.reply({ content: 'Message sent.', ephemeral: true });
        }
        catch (e) {
            console.log(e);
            interaction.reply({ content: 'Invalid options given.', ephemeral: true });
        }
    }
}