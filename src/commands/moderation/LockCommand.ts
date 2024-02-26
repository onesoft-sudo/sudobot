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

import { PermissionsBitField, SlashCommandBuilder, TextChannel, User } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/Logger";
import { isTextableChannel } from "../../utils/utils";

export default class LockCommand extends Command {
    public readonly name = "lock";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.Channel, ArgumentType.String],
            optional: true,
            name: "channel",
            errors: {
                "type:invalid": "Please provide a valid channel to lock!"
            }
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageChannels];

    public readonly description = "Locks a channel.";
    public readonly detailedDescription =
        "This command locks down a channel. If no channel is given, the current channel will be locked.";
    public readonly argumentSyntaxes = ["[ChannelID|ChannelMention]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.ManageChannels];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand => subcommand.setName("server").setDescription("Lock the entire server"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("channel")
                .setDescription("Lock one single channel")
                .addChannelOption(option =>
                    option.setName("channel").setDescription("The channel that will be locked. Default is the current channel")
                )
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (
            (!context.isLegacy && context.options.getSubcommand(true) === "server") ||
            (context.isLegacy && context.parsedNamedArgs.channel === "server")
        ) {
            return await this.client.commands.get("lock__lockall")?.execute(message, context);
        }

        if (context.isLegacy && typeof context.parsedNamedArgs.channel === "string") {
            await this.error(message, "Please provide a text channel to lock, or specify `server` to lock the entire server!");
            return;
        }

        const channel: TextChannel =
            (context.isLegacy ? context.parsedNamedArgs.channel : context.options.getChannel("channel")) ?? message.channel!;

        if (!isTextableChannel(channel)) {
            await this.error(message, "Please provide a valid text channel to lock!");
            return;
        }

        const result = await this.client.channelLockManager.lock(channel, message.member!.user as User);

        if (!result) await this.error(message, `Failed to lock this channel.`);
        else await this.deferredReply(message, `${this.emoji("check")} This channel has been locked.`).catch(logError);
    }
}
