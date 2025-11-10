import Command from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { MessageFlags } from "discord.js";

class About2Command extends Command {
    public override readonly name: string = "about2";
    public override async execute(context: Context): Promise<void> {
        await context.reply({
            content: "test",
            flags: [MessageFlags.Ephemeral]
        });
    }
}

export default About2Command;
