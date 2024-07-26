import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import ChannelArgument from "@framework/arguments/ChannelArgument";
import DurationArgument from "@framework/arguments/DurationArgument";
import { type Buildable, Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import Duration from "@framework/datetime/Duration";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { isDiscordAPIError } from "@framework/utils/errors";
import type { GuildBasedChannel } from "discord.js";

type SetSlowmodeCommandArgs = {
    duration: Duration;
    channel?: GuildBasedChannel;
};

@ArgumentSchema.Definition({
    names: ["duration"],
    types: [DurationArgument],
    optional: false,
    errorMessages: [DurationArgument.defaultErrors]
})
@ArgumentSchema.Definition({
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
    public override readonly permissions = [PermissionFlags.ManageChannels];

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
