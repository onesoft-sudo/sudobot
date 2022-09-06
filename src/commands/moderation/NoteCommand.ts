import { BanOptions, CommandInteraction, Guild, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import { fetchEmoji } from '../../utils/Emoji';

export async function note(user: GuildMember | User, content: string, msg: Message | CommandInteraction) {
    const { default: Note } = await import('../../models/Note');

    return await Note.create({
        content,
        author: msg.member!.user.id,
        mod_tag: (msg.member!.user as User).tag,
        user_id: user.id,
        guild_id: msg.guild!.id,
        createdAt: new Date(),
    });
}

export default class NoteCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('note', 'moderation', []);
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

        let user: User;
        let content: string | undefined;

        if (options.isInteraction) {
            user = await <User> options.options.getUser('user');

            if (!user) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription("Invalid user given.")
                    ]
                });
    
                return;
            }

            content = <string> options.options.getString('note');
        }
        else {
            try {
                const user2 = await getUser(client, (msg as Message), options);

                if (!user2) {
                    throw new Error('Invalid user');
                }

                user = user2;
            }
            catch (e) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });
    
                return;
            }

            console.log(user);

            await options.args.shift();
            content = options.args.join(' ');
        }

        const n = await note(user, content as string, msg);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`${(await fetchEmoji('check'))?.toString()} A note has been added for ${user.tag}`)
                .setFooter({
                    text: `ID: ${n.id}`
                })
            ]
        });
    }
}