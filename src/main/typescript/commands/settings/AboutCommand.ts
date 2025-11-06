import Command from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import type { Awaitable } from "discord.js";

class AboutCommand extends Command {
    public override readonly name: string = "about";
    public override execute(_context: Context): Awaitable<void> {}
}

export default AboutCommand;
