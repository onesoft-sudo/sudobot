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
                .addStringOption(option =>
                    option
                        .setName("category")
                        .setDescription("The category of the image to fetch.")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "Waifu",
                                value: "waifu"
                            },
                            {
                                name: "Neko",
                                value: "neko"
                            },
                            {
                                name: "Shinobu",
                                value: "shinobu"
                            },
                            {
                                name: "Megumin",
                                value: "megumin"
                            },
                            {
                                name: "Bully",
                                value: "bully"
                            },
                            {
                                name: "Cuddle",
                                value: "cuddle"
                            }
                        )
                )
                .addBooleanOption(option =>
                    option.setName("nsfw").setDescription("Whether to fetch an NSFW image.")
                )
        ];
    }

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ) {
        const category = context.isLegacy()
            ? context.args[0]
            : context.options.getString("category", true);

        if (!category || !this.validCategories.includes(category)) {
            return void (await context.reply(
                `Please provide a valid category. Valid categories are: ${this.validCategories.join(", ")}`
            ));
        }

        const nsfw = context.isLegacy() ? false : !!context.options.getBoolean("nsfw");

        if (
            nsfw &&
            ((context.channel.isThread() &&
                context.channel.parent?.isTextBased() &&
                !context.channel.parent.nsfw) ||
                (!context.channel.isThread() &&
                    context.channel.isTextBased() &&
                    !context.channel.nsfw))
        ) {
            return void (await context.reply(
                "Cannot post NSFW media as this channel is not marked as NSFW."
            ));
        }

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
                            attachment: response.data.url,
                            spoiler: nsfw
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
