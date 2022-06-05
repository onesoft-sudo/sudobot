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
import { fetchEmojiStr } from '../../utils/Emoji';
import Note from '../../models/Note';

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
            id = await <string> options.options.getNumber('id')?.toString();
        }
        else {
            id = await options.args[0];
        }

        const note = await Note.findOne({
            where: {
                guild_id: msg.guild!.id,
                id
            }
        });

        if (!note) {
            await msg.reply(`${await fetchEmojiStr('error')} Invalid note ID.`);
            return;
        }

        let user;

        try {
            user = await client.users.fetch(note.get().user_id);
        }
        catch (e) {
            console.log(e);            
        }

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user?.tag ?? note.get().user_id,
                        iconURL: user instanceof User ? user.displayAvatarURL() : undefined,
                    },
                    description: note.get().content,
                    fields: [
                        {
                            name: 'Note taken by',
                            value: note.get().mod_tag
                        }
                    ],
                    footer: {
                        text: `ID: ${note.get().id}`
                    },
                    timestamp: note.get().createdAt
                })
            ]
        });
    }
}