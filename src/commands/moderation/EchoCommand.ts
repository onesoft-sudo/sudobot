import { BanOptions, CommandInteraction, EmojiIdentifierResolvable, GuildMember, Interaction, Message, Permissions, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';
import { fetchEmoji } from '../../utils/Emoji';

export default class EchoCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('echo', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
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

        let content: string;
        let channel: TextChannel = <TextChannel> msg.channel;

        if (options.isInteraction) {
            content = await <string> options.options.getString('content');

            if (options.options.getChannel('channel')) {
                channel = await <TextChannel> options.options.getChannel('channel');
            }
        }
        else {
            if ((msg as Message).mentions.channels.last()) {
                channel = await <TextChannel> (msg as Message).mentions.channels.last();
                await options.args.pop();
            }

            content = await options.args.join(' ');
        }
        
        if (!channel.send) {
            await msg.reply({
                content: 'Invalid text channel.',
                ephemeral: true
            });

            return;
        }

        try {
            await channel.send({
                content
            });

            if (options.isInteraction) {
                const emoji = await fetchEmoji('check');

                console.log(emoji);                

                await msg.reply({
                    content: emoji!.toString() + " Message sent!",
                    ephemeral: true
                });
            }
            else {
                await (msg as Message).react(await fetchEmoji('check') as EmojiIdentifierResolvable);
            }
        }
        catch (e) {
            console.log(e);
            
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Failed to send message. Maybe missing permissions?`)
                ],
                ephemeral: true
            });

            return;
        }
    }
}