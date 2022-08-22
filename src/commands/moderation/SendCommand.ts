import { BanOptions, CommandInteraction, EmojiIdentifierResolvable, FileOptions, GuildMember, Interaction, Message, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';
import { fetchEmoji } from '../../utils/Emoji';
import { parseEmbedsInString } from '../../utils/util';

export default class SendCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('send', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[1] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        let content: string;
        let member: GuildMember | undefined | null;

        if (options.isInteraction) {
            member = await <GuildMember> options.options.getMember('member');
            content = await <string> options.options.getString('content');
        }
        else {
            member = await getMember(msg as Message, options);

            if (!member) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });

                return;
            }

            options.args.shift();
            content = await options.args.join(' ');
        }

        try {
            let { embeds, content: parsedContent } = parseEmbedsInString(content);

            await member.send({
                content: parsedContent.trim() === '' ? undefined : parsedContent,
                embeds,
                files: msg instanceof CommandInteraction ? undefined : [...msg.attachments.map(a => ({
                    attachment: a.proxyURL,
                    description: a.description,
                    name: a.name
                } as FileOptions)).values()]
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
                    .setDescription(`Failed to send message. Maybe invalid embed schema or the user has disabled DMs?`)
                ],
                ephemeral: true
            });

            return;
        }
    }
}