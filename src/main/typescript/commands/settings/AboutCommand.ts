import Command from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { MessageFlags } from "discord.js";

class AboutCommand extends Command {
    public override readonly name: string = "about";
    public override async execute(context: Context): Promise<void> {
        await context.reply({
            content: "test",
            flags: [MessageFlags.Ephemeral]
        });
    }
}

export default AboutCommand;
