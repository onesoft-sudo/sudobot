import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { emoji } from '../../utils/Emoji';

export default class EmbedCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy = false;
    subcommands = ['send', 'schema', 'build'];

    constructor() {
        super('embed', 'settings', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(`${emoji('error')} No subcommand provided.`);
            return;
        }

        if (!options.isInteraction && (options.args[0] === 'send' || options.args[0] === 'schema')) {
            await message.reply(`${emoji('error')} This command can not be used in legacy mode. Use slash commands instead.`);
            return;
        }

        if (!options.isInteraction && !this.subcommands.includes(options.args[0])) {
            await message.reply(`${emoji('error')} Invalid subcommand provided. Must be one of ${this.subcommands.map(c => `\`${c}\``)}.`);
            return;
        }

        const subcommand = options.isInteraction ? options.options.getSubcommand() : options.args[0];

        const command = client.commands.get('embed__' + subcommand);

        if (command) {
            await command.execute(client, message, options);
        }
    }
}