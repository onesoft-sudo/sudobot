import { BanOptions, CommandInteraction, Emoji, GuildMember, Interaction, Message, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';
import { fetchEmoji } from '../../utils/Emoji';

export default class ClearCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('clear', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('This command requires at least one argument.')
                ]
            });

            return;
        }

        let member: GuildMember | undefined | null;

        if (options.isInteraction) {
            member = <GuildMember> await options.options.getMember('member');
        }
        else {
            try {
                member = await getMember(msg as Message, options);

                if (!member) {
                    throw new Error();
                }
            }
            catch (e) {
                console.log(e);
                
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('Invalid user given.')
                    ]
                });
    
                return;
            }
        }

        let fetched;
        let count = 0;

        const message = await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('GOLD')
                .setDescription('Deleting messages...')
            ]
        });

        do {
            fetched = await msg.channel!.messages.fetch({ limit: 100 });
            fetched = await fetched.filter(m => m.author.id === member!.id);
            await (msg.channel as TextChannel).bulkDelete(fetched);
            count += await fetched.size;
        }
        while (fetched.size >= 2);

        const messageOptions = {
            embeds: [
                new MessageEmbed()
                .setColor('GREEN')
                .setDescription((await fetchEmoji('check') as Emoji).toString() + " Deleted " + count + " message(s) from user " + member.user.tag)
            ]
        };

        if (msg instanceof CommandInteraction) {
            await msg.editReply(messageOptions);
        }
        else {
            await message!.edit(messageOptions);
        }
    }
}