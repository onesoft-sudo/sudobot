import { BanOptions, CommandInteraction, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';

export default class NotesCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('notes', 'moderation', []);
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

        let user: GuildMember;

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
        }

        await client.db.all("SELECT * FROM notes WHERE user_id = ? AND guild_id = ?", [user.id, msg.guild!.id], async (err: any, data: any) => {
            if (err) {
                console.log(err);
            }

            if (data === undefined || data.length < 1) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('No notes found for user ' + user.user.tag)
                    ]
                });

                return;
            }

            let desc = '';

            for (let row of data) {
                desc += `\n\n**Note #${row.id}**\n${row.content}\nDate: ${new Date(row.date).toUTCString()}`;
            }

            desc = desc.substring(1);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        iconURL: user.displayAvatarURL(),
                        name: user.user.tag
                    })
                    .setDescription(desc)
                ]
            });
        });
    }
}