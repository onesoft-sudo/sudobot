import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import ChannelLockManager from "@main/services/ChannelLockManager";
import { PermissionFlagsBits } from "discord.js";

class LockAllCommand extends Command {
    public override readonly name = "lockall";
    public override readonly description: string = "Locks all channels.";
    public override readonly detailedDescription: string = "Locks all the channels in this server.";
    public override readonly permissions = [PermissionFlagsBits.ManageChannels];
    public override readonly systemPermissions = [PermissionFlagsBits.ManageChannels];

    @Inject()
    private readonly channelLockManager!: ChannelLockManager;

    public override async execute(context: Context): Promise<void> {
        const message = await context.reply(`${context.emoji("loading")} Locking all channels...`);
        const { alreadyLocked, errors, permissionErrors, success, total, skipped } =
            await this.channelLockManager.lockAll(context.guild);

        message.edit({
            content: null,
            embeds: [
                {
                    color: 0x007bff,
                    description:
                        `## :lock: Locked ${success}/${total} Channels\n**Total**: ${total}\n**Success**: ${success}\n**Skipped:** ${skipped}\n**Already Locked**: ${alreadyLocked}\n**Missing permissions**: ${permissionErrors}` +
                        (errors.length > 0 ? `\n\n__Errors__:\n${errors.join("\n")}` : "")
                }
            ]
        });
    }
}

export default LockAllCommand;
