import { BanOptions, CommandInteraction, Guild, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import ms from 'ms';
import Note from '../../models/Note';
import { fetchEmojiStr } from '../../utils/Emoji';

export default class NotedelCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('notedel', 'moderation', []);
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

        await note.delete();

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    description: `${await fetchEmojiStr('check')} Note deleted.`
                })
            ]
        });
    }
}