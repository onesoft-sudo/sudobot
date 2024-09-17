/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import ChannelLockManager from "@main/services/ChannelLockManager";
import { PermissionFlagsBits } from "discord.js";

class LockAllCommand extends Command {
    public override readonly name = "lockall";
    public override readonly description: string = "Locks all channels.";
    public override readonly detailedDescription: string = "Locks all the channels in this server.";
    public override readonly permissions = [PermissionFlags.ManageChannels];
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
