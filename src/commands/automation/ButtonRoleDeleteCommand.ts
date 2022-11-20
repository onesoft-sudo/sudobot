import { Message, Interaction, CacheType, CommandInteraction } from "discord.js";
import Client from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class ButtonRoleDeleteCommand extends BaseCommand {
    name = "buttonrole__delete";
    category = "automation";

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[1] === undefined) {
            await message.reply(":x: Please specify the ID of the react role message.");
            return;
        }

        
    }
}