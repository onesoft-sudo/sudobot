import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import ChannelArgument from "@framework/arguments/ChannelArgument";
import { Command, type Buildable } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { isDiscordAPIError } from "@framework/utils/errors";
import type { GuildBasedChannel } from "discord.js";

type ArchiveCommandArgs = {
    channel?: GuildBasedChannel;
};

@ArgumentSchema.Definition({
    names: ["channel"],
    types: [ChannelArgument<true>],
    errorMessages: [ChannelArgument.defaultErrors],
    optional: true
})
class ArchiveCommand extends Command {
    public override readonly name: string = "archive";
    public override readonly description: string = "Archive a channel.";
    public override readonly usage = ["<channel: Channel>"];
    public override readonly permissions = [PermissionFlags.ManageChannels];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addChannelOption(option =>
                option.setName("channel").setDescription("The channel to archive").setRequired(true)
            )
        ];
    }

    public override async execute(
        context: Context,
        { channel }: ArchiveCommandArgs
    ): Promise<void> {
        const config = context.config?.channel_archives;

        if (!config?.enabled) {
            await context.error("Channel archives are not enabled.");
            return;
        }

        channel ??= context.channel;

        if (!channel.manageable) {
            await context.error("The system cannot manage this channel.");
            return;
        }

        if (
            channel.parentId === config.archive_category ||
            channel.id === config.archive_category
        ) {
            await context.error("You cannot archive an already archived channel.");
            return;
        }

        if (config.ignored_channels.includes(channel.id)) {
            await context.error("This channel cannot be archived.");
            return;
        }

        if (channel.isThread()) {
            await context.error("You cannot archive a thread.");
            return;
        }

        try {
            await channel.setParent(config.archive_category, {
                reason: `Archived by ${context.user.username}`
            });
        } catch (error) {
            if (isDiscordAPIError(error)) {
                await context.error(`${error.message ?? `An error occurred while archiving ${channel}: Code ${error.status}`}`);
                return;
            }
        }

        await context.success(`Channel ${channel} has been archived.`);
    }
}

export default ArchiveCommand;
