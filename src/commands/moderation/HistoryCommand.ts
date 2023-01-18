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

import { CommandInteraction, ContextMenuInteraction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import Punishment, { IPunishment } from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import Pagination from '../../utils/Pagination';
import { format, formatDistanceToNowStrict } from 'date-fns';

export const convert = (type: PunishmentType) => {            
    switch (type) {
        case PunishmentType.BAN:
            return 'Ban';
        case PunishmentType.SOFTBAN:
            return 'Soft Ban';
        case PunishmentType.TEMPBAN:
            return 'Temporary Ban';
        case PunishmentType.SHOT:
            return 'Shot';
        case PunishmentType.MUTE:
            return 'Mute';
        case PunishmentType.HARDMUTE:
            return 'Hardmute';
        case PunishmentType.KICK:
            return 'Kick';
        case PunishmentType.WARNING:
            return 'Warning';
        case PunishmentType.UNBAN:
            return 'Unban';
        case PunishmentType.UNMUTE:
            return 'Unmute';
        case PunishmentType.BEAN:
            return 'Bean';
        default:
            return "Unknown";
    }
};

export default class HistoryCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsContextMenu = true;

    constructor() {
        super('history', 'moderation', ['Moderation History']);
    }

    verboseOutput(data: IPunishment[]) {
        let str = '';
                
        for (const row of data) {
            str += `**Case ID**: \`${row.numericId}\`\n`;
            str += `**Type**: ${convert(row.type as PunishmentType)}\n`;
            str += `**Reason**: ${row.reason ? (row.reason.trim() === '' ? '*No reason provided*' : `\`\`\`${row.reason}\`\`\``) : '*No reason provided*'}\n`;

            str += `**Action Executor**: ${row.mod_tag} (<@${row.mod_id}>)\n`;
            str += `**Date**: ${format(row.createdAt, "dd MMMM yyyy 'at' h:mm a")} (${formatDistanceToNowStrict(row.createdAt, { addSuffix: true })})\n`;

            if (row.meta) {
                const json = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;

                if (Object.keys(json).length > 0) {
                    str += "Additional Attributes:\n```\n";

                    for (const key in json) {
                        str += `${key}: ${json[key]}\n`;
                    }

                    str += '\n```\n';
                }
            }

            str += '\n';
        }

        return str;
    }

    shortOutput(data: IPunishment[]) {
        let str = '';

        for (const row of data) {
            str += `\`${row.numericId}\` | \`${convert(row.type as PunishmentType)}\` | <@${row.user_id}> | Moderated by <@${row.mod_id}> | ${formatDistanceToNowStrict(row.createdAt, { addSuffix: true })}\n`;
        }

        return str;
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction | ContextMenuInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        if (msg instanceof CommandInteraction || msg instanceof ContextMenuInteraction) {
            await msg.deferReply({ ephemeral: true });
        }

        let user: User | null | undefined;
        let verbose = options.isInteraction ? (options.options.getBoolean('verbose') ?? true) : (!options.args.includes('--no-verbose') && !options.args.includes('-s'));

        if (options.isInteraction) {
            user = await <User> options.options.getUser('user');
        }
        else {
            try {
                user = await getUser(client, msg as Message, options);

                if (!user) 
                    throw new Error();
            }
            catch (e) {
                console.log(e);
                
                await this.deferReply(msg, {
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });

                return;
            }
        }

        const { verboseOutput, shortOutput } = this;

        const paginator = new Pagination<IPunishment>(null, {
            channel_id: msg.channel!.id,
            guild_id: msg.guild!.id,
            limit: 5,
            timeout: 120_000,
            user_id: msg.member!.user.id,
            async maxData() {
                return await Punishment.find({ 
                    guild_id: msg.guild!.id,
                    user_id: user!.id,
                }).count();
            },
            async fetchData({ limit, offset }) {
                const data = await Punishment.find({ 
                    guild_id: msg.guild!.id,
                    user_id: user!.id,
                }).skip(offset).limit(limit).sort({ createdAt: -1 });

                return data;
            },
            embedBuilder({ data, currentPage, maxPages }) {
                const str = verbose ? verboseOutput(data) : shortOutput(data);

                return new MessageEmbed({
                    author: {
                        name: user!.tag,
                        iconURL: user!.displayAvatarURL()
                    },
                    title: 'Moderation History',
                    description: str === '' ? 'No history.' : str,
                    timestamp: new Date(),
                    footer: { text: `Page ${currentPage} of ${maxPages === 0 ? 1 : maxPages}` }
                });
            },
        });

        let reply = <Message> await this.deferReply(msg, await paginator.getMessageOptions(1));

        if (msg instanceof CommandInteraction) {
            reply = <Message> await msg.fetchReply();
        }

        paginator.start(reply).catch(console.error);
    }
}
