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

import { CommandInteraction, ContextMenuInteraction, Message, MessageContextMenuInteraction, Modal, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { emoji } from '../../utils/Emoji';
import MessageEmbed from '../../client/MessageEmbed';

export default class TranslateCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsContextMenu = true;

    constructor() {
        super('translate', 'settings', ['tr', 'trnsl', 't', "Translate to English"]);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction | MessageContextMenuInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(`${emoji('error')} You must specify the text to translate.`);
            return;
        }

        if (message instanceof MessageContextMenuInteraction && (!message.targetMessage.content || message.targetMessage.content.trim() === '')) {
            await message.reply(`${emoji('error')} The message does not have any text content. Note that embeds cannot be translated.`);
            return;
        }

        if (!(message instanceof Message))
            await message.deferReply({
                ephemeral: message instanceof CommandInteraction ? message.options.getBoolean('ephemeral') ?? false : false
            });

        const from = message instanceof CommandInteraction ? message.options.getString('from') ?? 'auto' : 'auto';
        const to = message instanceof CommandInteraction ? message.options.getString('to') ?? 'en' : 'en';
        const text = message instanceof Message ? message.content.slice(client.config.props[message.guildId!].prefix.length).trim().slice(options.cmdName.length).trim() : (
            message instanceof CommandInteraction ? message.options.getString('text', true) : message.targetMessage.content
        );

        const { error, translation, response } = await client.translator.translate(text, from, to);

        if (error) {
            await this.deferReply(message, {
                embeds: [
                    new MessageEmbed({
                        color: 0xf14a60,
                        author: {
                            name: "Translation Failed"
                        },
                        description: `${emoji('error')} Couldn't translate that due to an internal error.`,
                        footer: {
                            text: "Powered by Google Translate",
                        }
                    })
                    .setTimestamp()
                ]
            });

            return;
        }

        await this.deferReply(message, {
            embeds: [
                new MessageEmbed({
                    color: 0x007bff,
                    author: {
                        name: message instanceof MessageContextMenuInteraction ? (message.targetMessage.author as User).tag : "Translation",
                        iconURL: message instanceof MessageContextMenuInteraction ? (message.targetMessage.author as User).displayAvatarURL() : undefined,
                    },
                    description: translation,
                    footer: {
                        text: `Translated from ${response!.data.src} to ${to} • Powered by Google Translate`,
                    }
                })
                .setTimestamp()
            ]
        });
    }
}