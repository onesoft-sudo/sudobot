import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { getAxiosClient } from "@main/utils/axios";

class EncourageCommand extends Command {
    public override readonly name = "encourage";
    public override readonly description = "Show inspirational quotes.";
    public override readonly defer = true;
    public override readonly usage = [""];
    public override readonly systemPermissions = [];
    public override readonly aliases = ["quote", "inspire"];

    protected readonly url = "https://zenquotes.io/api/random";

    public override build(): Buildable[] {
        return [this.buildChatInput()];
    }

    public override async execute(context: Context): Promise<void> {
        try {
            const response = await getAxiosClient().get(this.url);

            if (response.data.error || response.data.length === 0) {
                throw new Error();
            }

            const [quote] = response.data;
            await context.reply(`> ${quote.q.replace(/\n/gi, "\n> ")}\n\n — *${quote.a}*`);
        } catch (e) {
            await context.error(
                "The API did not return a valid status code. This is a possible error in the API or you got rate limited."
            );
        }
    }
}

export default EncourageCommand;
