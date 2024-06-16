import axios from "axios";
import Command, { BasicCommandContext, CommandMessage, CommandReturn } from "@sudobot/core/Command";
import { logError } from "@sudobot/utils/Logger";

export default class NekoCommand extends Command {
    public readonly name = "neko";
    public readonly validationRules = [];
    public readonly permissions = [];

    public readonly description = "Fetch a random neko image";

    async execute(message: CommandMessage): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        try {
            const response = await axios.get("https://nekos.best/api/v2/neko");

            if (response.status < 200 || response.status >= 300)
                throw new Error("Invalid status code");

            await this.deferredReply(message, {
                files: [
                    {
                        attachment: response.data.results[0].url
                    }
                ]
            });
        } catch (e) {
            logError(e);
            await this.error(message, "Failed to fetch a neko image");
        }
    }
}
