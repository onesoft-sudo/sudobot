import axios from "axios";
import Command, { CommandMessage, CommandReturn } from "@sudobot/core/Command";
import { logError } from "@sudobot/utils/Logger";

export default class AnimeCommand extends Command {
    public readonly name = "anime";
    public readonly validationRules = [];
    public readonly permissions = [];

    public readonly description = "Fetch a random neko, waifu, or kitsune image";

    async execute(message: CommandMessage): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const apis = [
            "https://nekos.best/api/v2/neko",
            "https://nekos.best/api/v2/waifu",
            "https://nekos.best/api/v2/kitsune"
        ];

        const randomApi = apis[Math.floor(Math.random() * apis.length)];

        try {
            const response = await axios.get(randomApi);

            if (response.status < 200 || response.status >= 300) {
                throw new Error("Invalid status code");
            }

            await this.deferredReply(message, {
                files: [
                    {
                        attachment: response.data.results[0].url
                    }
                ]
            });
        } catch (e) {
            logError(e);
            await this.error(message, "Failed to fetch an image");
        }
    }
}
