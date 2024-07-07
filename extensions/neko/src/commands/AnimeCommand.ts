import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { getAxiosClient } from "@sudobot/utils/axios";

export default class AnimeCommand extends Command {
    public override readonly name = "anime";
    public override readonly description = "Fetch a random neko, waifu, or kitsune image";
    public override readonly permissions = [];
    public override readonly defer = true;

    public override async execute(context: Context<CommandMessage>) {
        const apis = [
            "https://nekos.best/api/v2/neko",
            "https://nekos.best/api/v2/waifu",
            "https://nekos.best/api/v2/kitsune"
        ];

        const randomApi = apis[Math.floor(Math.random() * apis.length)];

        try {
            const response = await getAxiosClient().get(randomApi);

            if (response.status < 200 || response.status >= 300) {
                throw new Error("Invalid status code");
            }

            await context.reply({
                files: [
                    {
                        attachment: response.data.results[0].url
                    }
                ]
            });
        } catch (error) {
            this.application.logger.error(error);
            await context.error("Failed to fetch an image.");
        }
    }
}
