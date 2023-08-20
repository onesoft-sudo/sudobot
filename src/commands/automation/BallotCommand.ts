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

import { ChannelType, SlashCommandBuilder, User } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";

export default class BallotCommand extends Command {
    public readonly name = "ballot";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.StringRest],
            name: "content",
            requiredErrorMessage: "Please provide the content to put inside the ballot/poll!",
            typeErrorMessage: "Invalid content provided"
        }
    ];
    public readonly permissions = [];
    public readonly description = "Sends a poll/ballot embed.";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option => option.setName("content").setDescription("The ballot/poll content").setRequired(true))
        .addBooleanOption(option =>
            option.setName("anonymous").setDescription("Anonymous mode won't show your name in the ballot. Default is true")
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("The channel where the message will be sent, defaults to the current channel")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message, { ephemeral: true });
        const content = context.isLegacy ? context.parsedNamedArgs.content : context.options.getString("content", true);
        const anonymous = (context.isLegacy ? null : context.options.getBoolean("anonymous")) ?? false;
        const channel =
            (context.isLegacy ? null : context.options.getChannel<ChannelType.GuildText>("channel")) ?? message.channel!;

        if (!channel.isTextBased()) {
            await this.error(message, "Cannot send messages into a non-text based channel!");
            return;
        }

        try {
            const ballotMessage = await channel.send({
                embeds: [
                    {
                        author: {
                            icon_url: anonymous
                                ? message.guild?.iconURL() ?? undefined
                                : (message.member?.user as User).displayAvatarURL(),
                            name: anonymous ? "Staff" : message.member!.user.username
                        },
                        color: 0x007bff,
                        description: content,
                        footer: {
                            text: `0 Votes • React to vote!`
                        }
                    }
                ]
            });

            ballotMessage.react(this.emoji("ArrowTop")).catch(logError);
            ballotMessage.react(this.emoji("ArrowDown")).catch(logError);

            try {
                const ballot = await this.client.ballotManager.create({
                    content,
                    guildId: message.guildId!,
                    userId: message.member!.user.id,
                    channelId: channel.id,
                    messageId: ballotMessage.id
                });

                await this.success(message, `The ballot/poll has been created successfully.\nID: \`${ballot.id}\``);
            } catch (e) {
                logError(e);
                return;
            }
        } catch (e) {
            logError(e);

            await this.error(
                message,
                "An error has occurred while sending the message. Make sure I have enough permissions to send messages here!"
            );

            return;
        }
    }
}
