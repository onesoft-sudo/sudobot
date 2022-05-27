import { CommandInteraction, FileOptions, GuildMember, Interaction, Message, MessageAttachment } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { download } from '../../utils/util';
import path from 'path';
import { fetchEmoji } from '../../utils/Emoji';

export default class AddsnippetCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super('snippet', 'utils', []);
    }

    async run(client: DiscordClient, msg: CommandInteraction, options: InteractionOptions) {
        if (options.options.getSubcommand(true) === 'get') {
            const snippet = await client.snippetManager.get(msg.guild!.id, options.options.getString('name')!);

            if (!snippet) {
                await msg.reply({
                    content: ":x: No snippet found with that name.",
                    ephemeral: true
                });

                return;
            }

            await msg.reply({
                content: snippet.content,
                files: snippet.files.map(name => {
                    return {
                        name,
                        attachment: path.resolve(__dirname, '../../../storage', name)
                    } as FileOptions
                }),
            });
        }

        let cmdName = '';

        if (options.options.getSubcommand(true) === 'create') 
            cmdName = 'addsnippet';
        else if (options.options.getSubcommand(true) === 'delete') 
            cmdName = 'delsnippet';
        else if (options.options.getSubcommand(true) === 'rename') 
            cmdName = 'mvsnippet';

        const command = await client.commands.get(cmdName);

        if (command) {
            return await command.run(client, msg, options);
        }
    }
}