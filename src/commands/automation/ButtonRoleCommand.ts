import { Message, Interaction, CacheType, CommandInteraction } from "discord.js";
import Client from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class ButtonRoleCommand extends BaseCommand {
    name = "buttonrole";
    category = "automation";
    aliases = ['btnrole', 'brole'];
    supportsInteractions = true;

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(":x: Please specify a subcommand. Run `-help " + options.argv[0] + "` to see what subcommands are available.");
            return;
        }

        const subcommand = options.isInteraction ? options.options.getSubcommand(true) : options.args[0];
        const command = client.commands.get(`buttonrole__${subcommand}`);

        if (!command) {
            await message.reply(":x: Invalid subcommand given.");
            return;
        }

        await command.execute(client, message, options);
    }
}