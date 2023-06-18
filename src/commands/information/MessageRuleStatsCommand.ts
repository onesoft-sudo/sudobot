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
import { CommandInteraction, Message, Util } from "discord.js";
import DiscordClient from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import BlockedWordViolation from "../../models/BlockedWordViolation";
import { BlockedWordType } from "../../types/BlockedWordType";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";

// TODO
export default class MessageRuleStatsCommand extends BaseCommand {
    name = "messagerulestats";
    group = "information";
    aliases = [];
    supportsInteractions = true;

    async run(client: DiscordClient, interaction: CommandInteraction, options: InteractionOptions): Promise<void> {
        const user = interaction.options.getUser('user') ?? undefined;
        const word_token = interaction.options.getString('word_or_token') ?? undefined;

        if (!user && !word_token) {
            await interaction.reply(`${emoji('error')} You must specify a user or a word/token to search!`);
            return;
        }

        await interaction.deferReply();

        if (user && word_token) {
            const data = await BlockedWordViolation.findOne({
                guild_id: interaction.guild!.id,
                user_id: user.id,
                word_token,
            });

            await interaction.editReply({
                embeds: [
                    new MessageEmbed({
                        author: {
                            iconURL: user.displayAvatarURL(),
                            name: user.tag
                        },
                        description: `This user has sent **${data?.count ?? 0}** messages total that contained the word/token: ||${Util.escapeMarkdown(word_token)}||. ${!data ? '' : `This word was last used by this user ${formatDistanceToNowStrict(data.updatedAt, { addSuffix: true })}`}.`,
                        fields: [
                            {
                                name: 'Suggested action',
                                value: (data?.count ?? 0) < 20 ? 'No action needed' : (
                                    (data?.count ?? 0) >= 20 && (data?.count ?? 0) < 50 ? 'Warning' : (
                                        (data?.count ?? 0) >= 50 && (data?.count ?? 0) < 80 ? 'Mute' : 'Ban/Kick'
                                    )
                                )
                            },
                            ...(data ? [
                                {
                                    name: 'Rule type',
                                    value: data.type === BlockedWordType.WORD ? 'Word' : 'Token'
                                }
                            ] : [])
                        ]
                    })
                ]
            });
        }
    }
}