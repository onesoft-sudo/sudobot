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

import { CacheType, CommandInteraction, Permissions, Util } from "discord.js";
import Client from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import Punishment from "../../models/Punishment";
import InteractionOptions from "../../types/InteractionOptions";
import BaseCommand from "../../utils/structures/BaseCommand";
import { convert } from "./HistoryCommand";
import PunishmentType from "../../types/PunishmentType";

export default class InfractionCreateCommand extends BaseCommand {
    name = "infraction__create";
    category = "moderation";
    aliases = ['iadd', 'icreate'];
    supportsInteractions = true;
    supportsLegacy = false;
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    async run(client: Client, interaction: CommandInteraction<CacheType>, options: InteractionOptions): Promise<void> {
        const type = interaction.options.getString('type', true);
        const user = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason');

        await interaction.deferReply();

        const punishment = await Punishment.create({
            type,
            mod_id: interaction.user.id,
            mod_tag: interaction.user.tag,
            guild_id: interaction.guildId!,
            reason,
            user_id: user.id,
            createdAt: new Date()
        });

        let str = '';

        if (punishment.meta) {
            const json = typeof punishment.meta === 'string' ? JSON.parse(punishment.meta) : punishment.meta;

            if (Object.keys(json).length > 0) {
                str += "Additional Attributes:\n```\n";

                for (const key in json) {
                    str += `${key}: ${json[key]}\n`;
                }

                str += '\n```\n';
            }
        }

        await interaction.editReply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user?.tag ?? `Unknown (ID: ${punishment.user_id})`,
                        iconURL: user?.displayAvatarURL()
                    },
                    title: 'Created Infraction: ' + punishment.numericId,
                    fields: [
                        {
                            name: 'Type',
                            value: convert(punishment.type as PunishmentType),
                            inline: true
                        },
                        {
                            name: 'Moderator',
                            value: `<@${punishment.mod_id}> (${Util.escapeMarkdown(punishment.mod_tag)})`,
                            inline: true
                        },
                        {
                            name: 'Meta Info',
                            value: str.trim() === '' ? '*No info*' : str,
                        },
                        {
                            name: 'Reason',
                            value: punishment.reason && punishment.reason.trim() !== '' ? punishment.reason : '*No reason provided*',
                        },
                        {
                            name: 'Date',
                            value: `${punishment.createdAt.toUTCString()} (now)`,
                        },
                    ],
                    footer: {
                        text: 'Created'
                    }
                })
                .setTimestamp()
            ]
        });
    }
}