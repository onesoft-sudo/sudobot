import { BanOptions, CommandInteraction, Guild, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import History from '../../automod/History';
import getMember from '../../utils/getMember';
import ms from 'ms';

export async function note(client: DiscordClient, user: GuildMember | User, content: string, msg: Message | CommandInteraction) {
    await client.db.get("INSERT INTO notes(user_id, guild_id, content, date) VALUES(?, ?, ?, ?)", [user.id, msg.guild!.id, content, (new Date().toISOString())], async (err: any) => {
        if (err) {
            console.log(err);
        }
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

        let user: GuildMember;
        let content: string | undefined;

        if (options.isInteraction) {
            user = await <GuildMember> options.options.getMember('member');

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
                const user2 = await getMember((msg as Message), options);

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

        await History.create(user.id, msg.guild!, 'note', msg.member!.user.id, null, async (data2) => {
            await note(client, user, content as string, msg);
        });

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setDescription(`A note has been added for ${user.user.tag}`) // TODO
            ]
        });
    }
}