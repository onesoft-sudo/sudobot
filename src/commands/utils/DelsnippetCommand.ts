import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';

export default class DelsnippetCommand extends BaseCommand {
    constructor() {
        super('delsnippet', 'utils', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        let name: string;

        if (options.isInteraction) {
            await (msg as CommandInteraction).deferReply();
            name = <string> await options.options.getString('name');
        }
        else {
            name = options.args[0];
        }

        const snippet = client.snippetManager.get(msg.guild!.id, name);

        if (!snippet) {
            await this.deferReply(msg, {
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription("No snippet exists with that name.")
                ]
            });

            return;
        }

        await client.snippetManager.delete(msg.guild!.id, name);
        await client.snippetManager.write();

        await this.deferReply(msg, {
            embeds: [
                new MessageEmbed()
                .setDescription((await fetchEmoji('check'))!.toString() + " Snippet deleted")
            ]
        });
    }
}