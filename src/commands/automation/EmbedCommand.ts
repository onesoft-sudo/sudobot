import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { emoji } from '../../utils/Emoji';

export default class EmbedCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    subcommands = ['send', 'schema', 'build'];

    constructor() {
        super('embed', 'automation', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction) {
            await message.reply(`${emoji('error')} This command can not be used in legacy mode. Use slash commands instead.`);
            return;
        }

        const subcommand = options.options.getSubcommand();

        const command = client.commands.get('embed__' + subcommand);

        if (command) {
            await command.execute(client, message, options);
        }
    }
}