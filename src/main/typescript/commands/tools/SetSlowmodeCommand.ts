import { type Buildable, Command } from "@framework/commands/Command";
import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import type Context from "@framework/commands/Context";
import type { GuildBasedChannel } from "discord.js";
import ChannelArgument from "@framework/arguments/ChannelArgument";
import Duration from "@framework/datetime/Duration";
import DurationArgument from "@framework/arguments/DurationArgument";
import { isDiscordAPIError } from "@framework/utils/errors";

type SetSlowmodeCommandArgs = {
    duration: Duration;
    channel?: GuildBasedChannel;
};

@TakesArgument<SetSlowmodeCommandArgs>({
    names: ["duration"],
    types: [DurationArgument],
    optional: false,
    errorMessages: [DurationArgument.defaultErrors]
})
@TakesArgument<SetSlowmodeCommandArgs>({
    names: ["channel"],
    types: [ChannelArgument<true>],
    optional: true,
    errorMessages: [ChannelArgument.defaultErrors]
})
class SetSlowmodeCommand extends Command {
    public override readonly name: string = "setslowmode";
    public override readonly description: string = "Sets a slowmode for the given channel.";
    public override readonly defer = true;
    public override readonly aliases = ["slowmode", "ratelimit"];
    public override readonly usage = ["<duration: Duration> [channel: Channel]"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("duration")
                        .setDescription("The duration of the slowmode.")
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to set the slowmode in.")
                        .setRequired(false)
                )
        ];
    }

    public override async execute(context: Context, args: SetSlowmodeCommandArgs) {
        const channel = args.channel ?? context.channel;

        if (!channel.isTextBased()) {
            return void (await context.error("The channel must be a text channel."));
        }

        if (!channel.manageable) {
            return void (await context.error(
                "The system doesn't have permission to manage this channel."
            ));
        }
        try {
            await channel.setRateLimitPerUser(
                args.duration.toSeconds(),
                `Changed by ${context.user.username} (${context.user.id})`
            );
        } catch (error) {
            if (isDiscordAPIError(error)) {
                return void (await context.error(`Failed to set slowmode: ${error.message}`));
            }
        }

        await context.success(
            `Slowmode set to ${args.duration.toString()} in ${channel.toString()}.`
        );
    }
}

export default SetSlowmodeCommand;
