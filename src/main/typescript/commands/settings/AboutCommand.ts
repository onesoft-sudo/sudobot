import Command from "@framework/commands/Command";
import type Context from "@framework/commands/Context";

class AboutCommand extends Command {
    public override readonly name: string = "ban";

    public override async execute(context: Context, args: Readonly<Record<string, unknown>>): Promise<void> {
        await Promise.resolve();
        console.log(args);
    }
}

export default AboutCommand;
