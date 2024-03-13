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

import { formatDistanceToNowStrict } from "date-fns";
import { GuildChannel, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { logError } from "../../components/io/Logger";
import Command, {
    ArgumentType,
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";
import { stringToTimeInterval } from "../../utils/datetime";

export default class SetSlowmodeCommand extends Command {
    public readonly name = "setslowmode";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.TimeInterval],
            time: {
                unit: "s",
                min: 0,
                max: 6 * 60 * 60 // 6 hours
            },
            errors: {
                required: "Please provide a slowmode duration to set!",
                "time:range": "The slowmode duration must be in range 0 seconds to 6 hours!",
                "type:invalid": "Please provide a valid slowmode duration to set!"
            },
            name: "duration"
        },
        {
            types: [ArgumentType.Channel],
            optional: true,
            entity: true,
            errors: {
                "entity:null": "That channel does not exist!",
                "type:invalid": "Please provide a valid channel!"
            },
            name: "channel"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageChannels];
    public readonly aliases = ["slow", "sm", "slowmode"];
    public readonly description = "Sets slowmode for a channel.";
    public readonly argumentSyntaxes = ["<duration> [channel]"];
    public readonly since = "6.44.0";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option =>
            option
                .setName("duration")
                .setDescription("The new slowmode duration to set (put 0 here to remove slowmode)")
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("The target text-based channel (defaults to current channel)")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const duration: number = context.isLegacy
            ? context.parsedNamedArgs.duration
            : stringToTimeInterval(context.options.getString("duration", true), {
                  milliseconds: false
              }).result;
        const channel: GuildChannel =
            (context.isLegacy
                ? context.parsedNamedArgs.channel
                : context.options.getChannel("channel")) ?? message.channel;

        if (!channel.isTextBased()) {
            await this.error(message, "Cannot set slowmode for a non-text based channel!");
            return;
        }

        if (!channel.manageable) {
            await this.error(message, "I'm not allowed to manage this channel.");
            return;
        }

        try {
            await channel.setRateLimitPerUser(
                duration,
                "Changing the slowmode as the user has commanded me to do so"
            );
            await this.success(
                message,
                `Successfully changed slowmode to ${formatDistanceToNowStrict(
                    new Date(Date.now() - duration * 1000)
                )} for channel ${channel.toString()}`
            );
        } catch (error) {
            logError(error);
            await this.error(message, "Failed to change slowmode.");
        }
    }
}
