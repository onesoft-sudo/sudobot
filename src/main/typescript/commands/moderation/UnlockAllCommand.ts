import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import ChannelLockManager from "@main/services/ChannelLockManager";
import { PermissionFlagsBits } from "discord.js";

class UnlockAllCommand extends Command {
    public override readonly name = "unlockall";
    public override readonly description: string = "Unlocks all channels.";
    public override readonly detailedDescription: string =
        "Unlocks all the channels in this server.";
    public override readonly permissions = [PermissionFlags.ManageChannels];
    public override readonly systemPermissions = [PermissionFlagsBits.ManageChannels];

    @Inject()
    private readonly channelLockManager!: ChannelLockManager;

    public override async execute(context: Context): Promise<void> {
        const message = await context.reply(
            `${context.emoji("loading")} Unlocking all channels...`
        );
        const { notLocked, errors, permissionErrors, success, total, skipped } =
            await this.channelLockManager.unlockAll(context.guild);

        message.edit({
            content: null,
            embeds: [
                {
                    color: 0x007bff,
                    description:
                        `## :closed_lock_with_key: Unlocked ${success}/${total} Channels\n**Total**: ${total}\n**Success**: ${success}\n**Skipped:** ${skipped}\n**Not Locked**: ${notLocked}\n**Missing permissions**: ${permissionErrors}` +
                        (errors.length > 0 ? `\n\n__Errors__:\n${errors.join("\n")}` : "")
                }
            ]
        });
    }
}

export default UnlockAllCommand;
