import { Buildable, Command } from "@framework/commands/Command";
import InteractionContext from "@framework/commands/InteractionContext";
import LegacyContext from "@framework/commands/LegacyContext";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { getAxiosClient } from "@sudobot/utils/axios";
import {
    ApplicationCommandOptionChoiceData,
    ChatInputCommandInteraction,
    type Interaction
} from "discord.js";

export default class AnimeCommand extends Command implements HasEventListeners {
    public override readonly name = "anime";
    public override readonly description = "Fetch a random anime waifu image.";
    public override readonly permissions = [];
    public override readonly defer = true;
    private readonly validCategories = [
        "waifu",
        "neko",
        "shinobu",
        "megumin",
        "bully",
        "cuddle",
        "cry",
        "hug",
        "awoo",
        "kiss",
        "lick",
        "pat",
        "smug",
        "bonk",
        "yeet",
        "blush",
        "smile",
        "wave",
        "highfive",
        "handhold",
        "nom",
        "bite",
        "glomp",
        "slap",
        "kill",
        "kick",
        "happy",
        "wink",
        "poke",
        "dance",
        "cringe"
    ];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption(option =>
                option
                    .setName("category")
                    .setDescription("The category of the image to fetch.")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
        ];
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isAutocomplete() || interaction.commandName !== this.name) {
            return;
        }

        const query = interaction.options.getString("category", true);
        const results: ApplicationCommandOptionChoiceData[] = [];

        for (const category of this.validCategories) {
            if (results.length >= 25) {
                break;
            }

            if (category.startsWith(query.toLowerCase())) {
                results.push({
                    name: category[0].toUpperCase() + category.slice(1),
                    value: category
                });
            }
        }

        await interaction.respond(results);
    }

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ) {
        const category = (
            context.isLegacy() ? context.args[0] : context.options.getString("category", true)
        )?.toLowerCase();

        if (!category || !this.validCategories.includes(category)) {
            return void (await context.reply(
                `Please provide a valid category. Valid categories are: ${this.validCategories.join(", ")}`
            ));
        }

        const url = `https://api.waifu.pics/sfw/${category}`;

        try {
            const response = await getAxiosClient().get(url);

            if (response.status < 200 || response.status >= 300) {
                throw new Error("Invalid status code");
            }

            try {
                await context.reply({
                    files: [
                        {
                            attachment: response.data.url
                        }
                    ]
                });
            } catch (error) {
                this.application.logger.error(error);
                await context.error("Failed to send image to this channel.");
            }
        } catch (error) {
            this.application.logger.error(error);
            await context.error("Failed to fetch image.");
        }
    }
}
