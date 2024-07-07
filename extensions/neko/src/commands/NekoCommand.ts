import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { getAxiosClient } from "@sudobot/utils/axios";

export default class NekoCommand extends Command {
    public override readonly name = "neko";
    public override readonly description = "Fetch a random neko image";
    public override readonly permissions = [];
    public override readonly defer = true;

    public override async execute(context: Context<CommandMessage>) {
        try {
            const response = await getAxiosClient().get("https://nekos.best/api/v2/neko");

            if (response.status < 200 || response.status >= 300)
                throw new Error("Invalid status code");

            await context.reply({
                files: [
                    {
                        attachment: response.data.results[0].url
                    }
                ]
            });
        } catch (error) {
            this.application.logger.error(error);
            await context.error("Failed to fetch a neko image.");
        }
    }
}
