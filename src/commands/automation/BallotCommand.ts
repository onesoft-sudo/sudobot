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

import { CommandInteraction, EmojiIdentifierResolvable, GuildMember, Message, Permissions, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import MessageEmbed from '../../client/MessageEmbed';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { fetchEmoji } from '../../utils/Emoji';
import Ballot from '../../models/Ballot';

export default class BallotCommand extends BaseCommand {
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    supportsInteractions = true;

    constructor() {
        super('ballot', 'automation', []);
    }

    async ballotCreate(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
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

        if (msg instanceof CommandInteraction)
            await msg.deferReply({
                ephemeral: true
            });

        let content: string;
        let channel: TextChannel = msg.channel as TextChannel;
        let anonymous = false;

        if (options.isInteraction) {
            content = <string> await options.options.getString('content');

            if (options.options.getChannel('channel'))
                channel = <TextChannel> await options.options.getChannel('channel');

            if (options.options.getBoolean('anonymous'))
                anonymous = <boolean> await options.options.getBoolean('anonymous');
        }
        else {
            if ((msg as Message).mentions.channels.last() && /\<#(\d+)\>/g.test([...options.args].pop()!)) {
                channel = <TextChannel> (msg as Message).mentions.channels.last();
                options.args.pop();
            }

            content = await options.args.join(' ').trim();
        }

        if (!channel.send) {
            await this.deferReply(msg, {
                content: 'Invalid text channel.'
            });

            return;
        }
        
        const message = await channel.send({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: anonymous ? 'Staff' : (msg.member?.user as User).tag!,
                    iconURL: anonymous ? msg.guild!.iconURL()! : (msg.member as GuildMember)?.displayAvatarURL()
                })
                .setDescription(content)
                .setTimestamp()
            ]
        });

        const ballot = new Ballot({
            content,
            author: anonymous ? null : msg.member?.user.id,
            msg_id: message.id,
            guild_id: msg.guild!.id,
            date: new Date(),
            channel_id: msg.channel!.id
        });

        await ballot.save();
        
        await message.react(<EmojiIdentifierResolvable> await fetchEmoji('check'));
        await message.react(<EmojiIdentifierResolvable> await fetchEmoji('error'));

        await this.deferReply(msg, {
            content: `${(await fetchEmoji('check'))!.toString()} Your message has been delivered. The ballot ID is ${ballot.get('id')}.`,
        });
    }

    async ballotView(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
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
        
        try {
            const id = options.isInteraction ? options.options.getString('id') : options.args[0];
            //const ballot = await client.db.getAsync("SELECT * FROM ballots WHERE id = ? ORDER BY id DESC LIMIT 0, 1", [id]);
            const ballot = await Ballot.findById(id);

            if (!ballot)
                throw new Error();

            const ballotAuthor = ballot.author ? (await msg.guild!.members.fetch(ballot.author)) : null;

            const channel = <TextChannel> await msg.guild?.channels.fetch(ballot.channel_id);
            
            if (!channel)
                throw new Error();

            const message = await channel.messages.fetch(ballot.msg_id);

            if (!message)
                throw new Error();

            const upEmote = await fetchEmoji('check');
            const downEmote = await fetchEmoji('error');
            const upVotes = message.reactions.cache.find(r => r.emoji.id === upEmote!.id)!.count - 1;
            const downVotes = message.reactions.cache.find(r => r.emoji.id === downEmote!.id)!.count - 1;

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        name: ballot.author ? ballotAuthor!.user!.tag! : 'Staff',
                        iconURL: ballot.author ? ballotAuthor?.displayAvatarURL()! : msg.guild!.iconURL()!
                    })
                    .setDescription(ballot.content)
                    .addFields([
                        {
                            name: 'Upvotes',
                            value: `${upVotes}`
                        },
                        {
                            name: 'Downvotes',
                            value: `${downVotes}`
                        }
                    ])
                    .setTimestamp()
                ]
            });
        }
        catch (e) {
            console.log(e);
            
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid ID or failed to fetch data.`)
                ]
            });
        }
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one subcommand.`)
                ]
            });

            return;
        }

        const subcmd = options.isInteraction ? options.options.getSubcommand(true) : options.args[0];

        if (!options.isInteraction)
            await options.args.shift();

        if (subcmd === 'create') 
            await this.ballotCreate(client, msg, options);
        else if (subcmd === 'view')
            await this.ballotView(client, msg, options);
        else {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid subcommand provided.`)
                ]
            });
        }
    }
}