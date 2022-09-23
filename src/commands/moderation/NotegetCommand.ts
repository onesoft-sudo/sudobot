import { CommandInteraction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
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
            id = await <string> options.options.getString('id');
        }
        else {
            id = await options.args[0];
        }

        const note = await Note.findOne({
            guild_id: msg.guild!.id,
            _id: id
        });

        if (!note) {
            await msg.reply(`${await fetchEmojiStr('error')} Invalid note ID.`);
            return;
        }

        let user;

        try {
            user = await client.users.fetch(note.user_id);
        }
        catch (e) {
            console.log(e);            
        }

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user?.tag ?? note.user_id,
                        iconURL: user instanceof User ? user.displayAvatarURL() : undefined,
                    },
                    description: note.content,
                    fields: [
                        {
                            name: 'Note taken by',
                            value: note.mod_tag
                        }
                    ],
                    footer: {
                        text: `ID: ${note.id}`
                    },
                    timestamp: note.createdAt
                })
            ]
        });
    }
}