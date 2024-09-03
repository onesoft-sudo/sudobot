import { Buildable, Command } from "@framework/commands/Command";
import InteractionContext from "@framework/commands/InteractionContext";
import LegacyContext from "@framework/commands/LegacyContext";
import { getAxiosClient } from "@sudobot/utils/axios";
import { ChatInputCommandInteraction } from "discord.js";

export default class AnimeCommand extends Command {
    public override readonly name = "anime";
    public override readonly description = "Fetch a random anime waifu image.";
    public override readonly permissions = [];
    public override readonly defer = true;
    private readonly validCategories = ["waifu", "neko", "shinobu", "megumin", "bully", "cuddle"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("waifu")
                        .setDescription("Fetch a random anime waifu image.")
                        .addBooleanOption(option =>
                            option
                                .setName("nsfw")
                                .setDescription("Whether the image should be NSFW.")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("neko")
                        .setDescription("Fetch a random anime neko image.")
                        .addBooleanOption(option =>
                            option
                                .setName("nsfw")
                                .setDescription("Whether the image should be NSFW.")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("shinobu")
                        .setDescription("Fetch a random anime shinobu image.")
                        .addBooleanOption(option =>
                            option
                                .setName("nsfw")
                                .setDescription("Whether the image should be NSFW.")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("megumin")
                        .setDescription("Fetch a random anime megumin image.")
                        .addBooleanOption(option =>
                            option
                                .setName("nsfw")
                                .setDescription("Whether the image should be NSFW.")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("bully")
                        .setDescription("Fetch a random anime bully image.")
                        .addBooleanOption(option =>
                            option
                                .setName("nsfw")
                                .setDescription("Whether the image should be NSFW.")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("cuddle")
                        .setDescription("Fetch a random anime cuddle image.")
                        .addBooleanOption(option =>
                            option
                                .setName("nsfw")
                                .setDescription("Whether the image should be NSFW.")
                        )
                )
        ];
    }

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ) {
        const category = context.isLegacy() ? context.args[0] : context.options.getSubcommand();

        if (!category || !this.validCategories.includes(category)) {
            return void (await context.reply(
                `Please provide a valid category. Valid categories are: ${this.validCategories.join(", ")}`
            ));
        }

        const nsfw = context.isLegacy() ? false : !!context.options.getBoolean("nsfw");
        const url = `https://api.waifu.pics/${nsfw ? "nsfw" : "sfw"}/${category}`;

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
