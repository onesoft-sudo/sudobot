import { CommandInteraction, Message, MessageAttachment } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { download } from '../../utils/util';
import path from 'path';
import { fetchEmoji } from '../../utils/Emoji';

export default class AddsnippetCommand extends BaseCommand {
    constructor() {
        super('addsnippet', 'utils', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[1] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        let name: string;
        let content: string;
        let files: MessageAttachment[] = [];
        let filenames: string[] = [];

        if (options.isInteraction) {
            await (msg as CommandInteraction).deferReply();
            name = <string> await options.options.getString('name');
            content = <string> await options.options.getString('content');

            if (options.options.getAttachment('file')) 
                files.push(await options.options.getAttachment('file')!);
        }
        else {
            name = options.args[0];
            options.args.shift();
            content = options.args.join(' ');

            if ((msg as Message).attachments.first()) {
                files = (msg as Message).attachments.map(a => {
                    return {
                        name: a.name,
                        url: a.proxyURL
                    } as MessageAttachment;
                });
            }
        }

        if (client.snippetManager.get(msg.guild!.id, name)) {
            await this.deferReply(msg, {
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription("A snippet already exists with that name.")
                ]
            });

            return;
        }

        for await (const file of files) {
            try {
                let filename = Math.round(Math.random() * 1000000) + '_' + file.name!;
                filenames.push(filename);
                await download(file.url, path.resolve(__dirname, '../../..', 'storage', filename));
            }
            catch (e) {
                console.log(e);                
            }
        }

        await client.snippetManager.set(msg.guild!.id, name, content, filenames);
        await client.snippetManager.write();

        await this.deferReply(msg, {
            embeds: [
                new MessageEmbed()
                .setDescription((await fetchEmoji('check'))!.toString() + " Snippet created")
            ]
        });
    }
}