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

import { formatDistanceToNowStrict } from "date-fns";
import { Message, CacheType, CommandInteraction, User, Util } from "discord.js";
import Client from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import Punishment from "../../models/Punishment";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import PunishmentType from "../../types/PunishmentType";
import BaseCommand from "../../utils/structures/BaseCommand";
import { convert } from "./HistoryCommand";

export default class InfractionViewCommand extends BaseCommand {
    name = "infraction__view";
    category = "moderation";
    aliases = ['i', 'infr', 'punishment'];
    supportsInteractions = true;

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(":x: You must provide an ID of an infraction to view it!");
            return;
        }

        const id = options.isInteraction ? options.options.getInteger('id', true) : options.args[0];

        if (!/^\d+$/.test(id.toString())) {
            await message.reply(":x: Invalid ID given.");
            return;
        }   

        if (message instanceof CommandInteraction)
            await message.deferReply();

        const punishment = await Punishment.findOne({
            numericId: id,
            guild_id: message.guild!.id,
        });

        if (!punishment) {
            await this.deferReply(message, ":x: No infraction found! Make sure the ID is correct and/or the infraction was not deleted manually!");
            return;
        }

        let user: User | undefined;

        try {
            user = await client.users.fetch(punishment.user_id);
        }
        catch (e) {
            console.log(e);
        }

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

        await this.deferReply(message, {
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user?.tag ?? `Unknown (ID: ${punishment.user_id})`,
                        iconURL: user?.displayAvatarURL()
                    },
                    title: 'Viewing Infraction: ' + id,
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
                            value: `${punishment.createdAt.toUTCString()} (${formatDistanceToNowStrict(punishment.createdAt, { addSuffix: true })})`,
                        },
                    ],
                })
                .setTimestamp()
            ]
        });
    }
}