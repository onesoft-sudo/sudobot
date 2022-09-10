import { CommandInteraction, FileOptions } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import path from 'path';

export default class AddsnippetCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super('snippet', 'utils', []);
    }

    async run(client: DiscordClient, msg: CommandInteraction, options: InteractionOptions) {
        if (options.options.getSubcommand(true) === 'get') {
            const snippet = await client.snippetManager.getParsed(msg.guild!.id, options.options.getString('name')!);

            if (!snippet) {
                await msg.reply({
                    content: ":x: No snippet found with that name.",
                    ephemeral: true
                });

                return;
            }

            try {
                await msg.reply({
                    content: snippet.content.trim() === '' ? undefined : snippet.content,
                    files: snippet.files.map(name => {
                        return {
                            name,
                            attachment: path.resolve(process.env.SUDO_PREFIX ?? path.join(__dirname, '../../..'), 'storage', name)
                        } as FileOptions
                    }),
                    embeds: snippet.embeds
                });
            }
            catch (e) {
                console.log(e);      
                await msg.reply({ content: 'Looks like that snippet is corrupted. Maybe invalid embed schema?', ephemeral: true });          
            }
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
