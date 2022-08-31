import { Message, Interaction, CacheType, CommandInteraction } from "discord.js";
import Client from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class LookupCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super("lookup", "information", []);
    }

    async run(client: Client, interaction: CommandInteraction, options: InteractionOptions): Promise<void> {
        if (interaction.options.getSubcommand() === "user") {
            await client.commands.get("userlookup")?.execute(client, interaction, options);
        }
        else if (interaction.options.getSubcommand() === "guild") {
            await client.commands.get("guildlookup")?.execute(client, interaction, options);
        }
        else if (interaction.options.getSubcommand() === "avatar") {
            await client.commands.get("avatarlookup")?.execute(client, interaction, options);
        }
        else {
            await interaction.reply({ content: "Invalid subcommand given. Must be one of 'user' or 'guild'." });
        }
    }
}