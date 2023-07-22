/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2023 OSN Developers.
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

import { OverwriteType, PermissionsBitField, SlashCommandBuilder, TextChannel } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";
import { isTextableChannel } from "../../utils/utils";

export default class UnlockCommand extends Command {
    public readonly name = "unlock";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.Channel],
            optional: true,
            name: "channel",
            typeErrorMessage: "Please provide a valid channel to unlock!"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageChannels];

    public readonly description = "Unlocks a channel.";
    public readonly detailedDscription = "This command unlocks down a channel. If no channel is given, the current channel will be unlocked.";
    public readonly argumentSyntaxes = [
        "[ChannelID|ChannelMention]",
    ];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.ManageChannels];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addChannelOption(option => option.setName('channel').setDescription("The channel that will be unlocked. Default is the current channel"));

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const channel: TextChannel = (context.isLegacy ? context.parsedNamedArgs.channel : context.options.getChannel("channel")) ?? message.channel!;

        if (!isTextableChannel(channel)) {
            await this.error(message, "Please provide a valid text channel to unlock!");
            return;
        }

        const permissionOverwrites = channel.permissionOverwrites.cache.get(message.guildId!);

        if (!permissionOverwrites?.deny.has(PermissionsBitField.Flags.SendMessages)) {
            await this.error(message, "This channel was not locked.");
            return;
        }

        try {
            await channel.permissionOverwrites.edit(message.guildId!, {
                SendMessages: true
            }, {
                reason: "Unlocking this channel as the user has run the unlock command",
                type: OverwriteType.Role
            });

            await this.deferredReply(message, `${this.emoji('check')} This channel has been unlocked.`).catch(logError);
        }
        catch (e) {
            await this.error(message, `Failed to unlock this channel.`);
        }
    }
}
