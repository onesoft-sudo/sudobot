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

export default class InfractionReasonUpdateCommand extends BaseCommand {
    name = "infraction__reasonupdate";
    category = "moderation";
    aliases = ['reasonupdate'];
    supportsInteractions = true;

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(":x: You must provide an ID of an infraction to update it's reason!");
            return;
        }

        if (!options.isInteraction && options.args[1] === undefined) {
            await message.reply(":x: You must provide a new reason to set!");
            return;
        }

        const id = options.isInteraction ? options.options.getInteger('id', true) : options.args.shift();
        const reason = options.isInteraction ? options.options.getString('reason', true) : options.args.join(' ');
        const silent = options.isInteraction ? options.options.getBoolean('silent') ?? false : false;

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

        const oldReason = punishment.reason;
        punishment.reason = reason;
        await punishment.save();

        if (!silent) {
            const convertedType = convert(punishment.type as PunishmentType);

            if ((['Ban', 'Temporary Ban', 'Hardmute', 'Kick', "Mute", 'Warning', 'Soft Ban', 'Shot', 'Bean'] as (typeof convertedType)[]).includes(convertedType)) {
                user?.send({
                    embeds: [
                        new MessageEmbed({
                            author: {
                                name: `Your ${convertedType.toLowerCase()} was updated in ${message.guild!.name}`,
                                iconURL: message.guild!.iconURL() ?? undefined
                            },
                            fields: [
                                {
                                    name: 'Reason',
                                    value: reason ?? '*No reason provided*'
                                },
                                {
                                    name: 'Case ID',
                                    value: punishment.id
                                }
                            ]
                        })
                    ]
                })?.catch(console.error);
            }
        }

        await this.deferReply(message, {
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user?.tag ?? `Unknown (ID: ${punishment.user_id})`,
                        iconURL: user?.displayAvatarURL()
                    },
                    title: 'Viewing Updated Infraction: ' + id,
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
                            name: 'Previous Reason',
                            value: oldReason && oldReason.trim() !== '' ? oldReason : '*No reason provided*',
                        },
                        {
                            name: 'New Reason',
                            value: punishment.reason && punishment.reason.trim() !== '' ? punishment.reason : '*No reason provided*',
                        },
                        {
                            name: 'Created At',
                            value: `${punishment.createdAt.toUTCString()} (${formatDistanceToNowStrict(punishment.createdAt, { addSuffix: true })})`,
                        },
                    ],
                    footer: {
                        text: 'Updated'
                    }
                })
                .setTimestamp()
            ]
        });
    }
}