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

export default class NotegetCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('noteget', 'moderation', []);
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

        let id: string;

        if (options.isInteraction) {
            id = await options.options.getNumber('id')?.toString()!;
        }
        else {
            id = options.args[0];
        }

        await client.db.get("SELECT * FROM notes WHERE id = ? AND guild_id = ?", [[id], msg.guild!.id], async (err: any, data: any) => {
            if (err) {
                console.log(err);
            }

            if (data === undefined) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('No note found')
                    ]
                });

                return;
            }

            let user;

            try {
                user = await msg.guild!.members.fetch(data.user_id);
                user = {
                    name: user.user.tag,
                    iconURL: user.displayAvatarURL()
                };
            }
            catch(e) {
                user = {
                    name: "User " + data.user_id
                };
            }

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription(data.content)
                    .setAuthor(user)
                    .setFields([
                        {
                            name: "ID",
                            value: data.id + ''
                        }
                    ])
                    .setTimestamp(new Date(data.date))
                ]
            });
        });

    }
}