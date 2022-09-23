import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { emoji } from '../../utils/Emoji';

export default class EvalCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    ownerOnly = true;

    constructor() {
        super('eval', 'settings', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply({
                content: emoji('error') + " Please enter the raw code that you want to execute.",
                ephemeral: true
            });

            return;
        }

        const code = options.isInteraction ? options.options.getString('code') : options.args.join(' ');

        try {
            const result = eval(code!);

            await message.reply({
                content: `${emoji('check')} **Execution Result:**\n\n\`\`\`js\n${result}\`\`\``,
                ephemeral: true
            });
        }
        catch (e) {
            await message.reply({
                content: `${emoji('error')} **Error Occurred!**\n\n\`\`\`\n${e}\`\`\``,
                ephemeral: true
            });
        }
    }
}