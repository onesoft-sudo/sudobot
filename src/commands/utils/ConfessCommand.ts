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

import { CommandInteraction, Message, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class ConfessCommand extends BaseCommand {
    supportsInteractions = true;
    supportsLegacy = false;

    constructor() {
        super('confess', 'utils', []);
    }

    async run(client: DiscordClient, interaction: CommandInteraction, options: InteractionOptions) {
        const anonymous = interaction.options.getBoolean('anonymous') ?? true;

        await interaction.channel?.send({
            embeds: [
                new MessageEmbed({
                    author: anonymous ? { name: "Anonymous Confession" } : {
                        name: interaction.user.tag,
                        iconURL: interaction.user.displayAvatarURL()
                    },
                    description: interaction.options.getString('description', true),
                    footer: {
                        text: `Report moderators if this confession violates server rules`
                    }
                })
                .setTimestamp()
            ]
        });

        try {
            const logging_channel = client.config.props[interaction.guildId!].logging_channel_confessions ?? client.config.props[interaction.guildId!].logging_channel;
            const channel = <TextChannel> await interaction.guild!.channels.fetch(logging_channel);

            await channel?.send({
                embeds: [
                    new MessageEmbed({
                        author: {
                            name: interaction.user.tag,
                            iconURL: interaction.user.displayAvatarURL()
                        },
                        title: "New Confession",
                        description: interaction.options.getString('description', true),
                        footer: {
                            text: (anonymous ? "Anonymous" : "Normal") + " Confession"
                        }
                    })
                    .setTimestamp()
                ]
            });
        }
        catch (e) {
            console.log(e);
        }

        await interaction.reply({
            content: "Confession posted successfully.",
            ephemeral: true
        });
    }
}