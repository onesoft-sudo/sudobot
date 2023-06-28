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

import { CommandInteraction, Message, Util } from "discord.js";
import DiscordClient from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";
import Pagination from "../../utils/Pagination";
import MessageEmbed from "../../client/MessageEmbed";

export default class BlockedTokenCommand extends BaseCommand {
    name = "blockedtoken";
    group = "settings";
    aliases = ["btoken", "blockedtokens", "bannedtoken", "bannedtoken"];
    supportsInteractions = true;

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const subcommand = options.isInteraction ? options.options.getSubcommand(true) : options.argv[1];

        const subcommands = ["add", "remove", "has", "list"];

        if (!subcommand) {
            await message.reply(`${emoji('error')} You must provide a subcommand with this command. The valid subcommands are: \`${subcommands.join('`, `')}\`.`);
            return;
        }

        if (!subcommands.includes(subcommand)) {
            await this.deferReply(message, `${emoji('error')} Invalid subcommand provided. The valid subcommands are: \`${subcommands.join('`, `')}\`.`);
            return;
        }

        if (!options.isInteraction && options.argv[2] === undefined && subcommand !== 'list') {
            await message.reply(`${emoji('error')} You must specify a token ${subcommand === 'add' ? 'to block' : (subcommand === 'remove' ? 'to remove' : 'to check')}!`);
            return;
        }

        if (message instanceof CommandInteraction) {
            await message.deferReply();
        }

        switch (subcommand) {
            case 'add':
                const tokenToBlock = message instanceof Message ? message.content.slice(client.config.get('prefix').length).trim().slice((options as CommandOptions).argv[0].length).trim().slice(subcommand.length).trim() : message.options.getString('token', true);

                if (client.config.props[message.guildId!]?.filters.tokens.includes(tokenToBlock)) {
                    await this.deferReply(message, `${emoji('error')} The given token is already blocked.`);
                    return;
                }

                client.config.props[message.guildId!]?.filters.tokens.push(tokenToBlock);
                client.config.write();

                await this.deferReply(message, `${emoji('check')} The given token has been blocked.`);
            break;

            case 'has':
                const token = !options.isInteraction ? options.argv[2] : options.options.getString('token', true);

                if (client.config.props[message.guildId!]?.filters.tokens.includes(token)) {
                    await this.deferReply(message, `${emoji('check')} This token is in the blocklist.`);
                    return;
                }
                else {
                    await this.deferReply(message, `${emoji('error')} This token is not in the blocklist.`);
                    return;
                }
            break;

            case 'remove':
                const tokenToUnblock = message instanceof Message ? message.content.slice(client.config.get('prefix').length).trim().slice((options as CommandOptions).argv[0].length).trim().slice(subcommand.length).trim() : message.options.getString('token', true);

                const index = client.config.props[message.guildId!]?.filters.tokens.indexOf(tokenToUnblock);

                if (index === -1) {
                    await this.deferReply(message, `${emoji('error')} The given token was not blocked.`);
                    return;
                }

                client.config.props[message.guildId!]?.filters.tokens.splice(index, 1);
                
                client.config.write();
                await this.deferReply(message, `${emoji('check')} The given token has been unblocked.`);
            break;

            case 'list':
                const tokens: string[] = client.config.props[message.guildId!]?.filters.tokens ?? [];
                const safeTokens: string[][] = [];
                let length = 0;

                for (const unsafeToken of tokens) {
                    if (safeTokens.length === 0)
                        safeTokens.push([]);

                    const token = Util.escapeMarkdown(unsafeToken);

                    if ((length + token.length) >= 3000) {
                        safeTokens.push([token]);
                        length = token.length;
                        continue;
                    }

                    const index = safeTokens.length - 1;
                    
                    safeTokens[index].push(token);
                    length += token.length;
                }
                
                const pagination = new Pagination(safeTokens, {
                    channel_id: message.channelId!,
                    guild_id: message.guildId!,
                    limit: 1,
                    timeout: 120_000,
                    user_id: message.member!.user.id,
                    embedBuilder({ currentPage, data, maxPages }) {
                        return new MessageEmbed({
                            author: {
                                name: `Blocked tokens in ${message.guild!.name}`,
                                iconURL: message.guild!.iconURL() ?? undefined
                            },
                            description: '`' + data[0].join('`, `') + '`',
                            footer: {
                                text: `Page ${currentPage} of ${maxPages}`
                            }
                        });
                    },
                });

                let reply = await this.deferReply(message, await pagination.getMessageOptions());

                if (message instanceof CommandInteraction)
                    reply = (await message.fetchReply()) as Message;

                pagination.start(reply);
            break;
        }
    }
}