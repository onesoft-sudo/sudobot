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

import { formatDistanceToNow } from "date-fns";
import {
    ChatInputCommandInteraction,
    GuildMember,
    PermissionsBitField,
    SlashCommandBuilder,
    User,
    escapeMarkdown
} from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { stringToTimeInterval } from "../../utils/datetime";
import { logError } from "../../utils/logger";
import { createModerationEmbed } from "../../utils/utils";

export default class BanCommand extends Command {
    public readonly name = "ban";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            entityNotNull: true,
            requiredErrorMessage: "You must specify a user to ban!",
            typeErrorMessage: "You have specified an invalid user mention or ID.",
            entityNotNullErrorMessage: "The given user does not exist!"
        },
        {
            types: [ArgumentType.TimeInterval, ArgumentType.StringRest],
            optional: true,
            minMaxErrorMessage: "The message deletion range must be a time interval from 0 second to 604800 seconds (7 days).",
            typeErrorMessage:
                "You have specified an invalid argument. The system expected you to provide a ban reason or the message deletion range here.",
            minValue: 0,
            maxValue: 604800,
            lengthMax: 3999,
            timeMilliseconds: false
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            typeErrorMessage: "You have specified an invalid ban reason.",
            lengthMax: 3999
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.BanMembers];

    public readonly description = "Bans a user.";
    public readonly detailedDescription =
        "This command can ban users in the server or outside of the server. If the user is not in the server, you must specify their ID to ban them.";
    public readonly argumentSyntaxes = ["<UserID|UserMention> [Reason]", "<UserID|UserMention> [MessageDeletionTime] [Reason]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.BanMembers];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("user").setDescription("The user").setRequired(true))
        .addStringOption(option => option.setName("reason").setDescription("The reason for banning this user"))
        .addStringOption(option =>
            option.setName("deletion_timeframe").setDescription("The message deletion timeframe (must be in range 0-604800s)")
        )
        .addBooleanOption(option =>
            option
                .setName("silent")
                .setDescription("Specify if the system should not notify the user about this action. Defaults to false")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (message instanceof ChatInputCommandInteraction) await message.deferReply();

        const user: User = context.isLegacy ? context.parsedArgs[0] : context.options.getUser("user", true);
        let deleteMessageSeconds = !context.isLegacy
            ? undefined
            : typeof context.parsedArgs[1] === "number"
            ? context.parsedArgs[1]
            : undefined;
        const reason = !context.isLegacy
            ? context.options.getString("reason") ?? undefined
            : typeof context.parsedArgs[1] === "string"
            ? context.parsedArgs[1]
            : context.parsedArgs[2];
        let durationMs: undefined | number = undefined;

        ifContextIsNotLegacyForDeleteTimeframe: if (!context.isLegacy) {
            const input = context.options.getString("deletion_timeframe");

            if (!input) break ifContextIsNotLegacyForDeleteTimeframe;

            const { result, error } = stringToTimeInterval(input);

            if (error) {
                await this.deferredReply(message, {
                    content: `${this.emoji("error")} ${error} provided in the \`deletion_timeframe\` option`
                });

                return;
            }

            if (result < 0 || result > 604800) {
                await this.deferredReply(
                    message,
                    `${this.emoji(
                        "error"
                    )} The message deletion range must be a time interval from 0 second to 604800 seconds (7 days).`
                );
                return;
            }

            deleteMessageSeconds = result;
        }

        ifContextIsNotLegacy: if (!context.isLegacy) {
            const input = context.options.getString("duration");

            if (!input) break ifContextIsNotLegacy;

            const { result, error } = stringToTimeInterval(input, { milliseconds: true });

            if (error) {
                await this.deferredReply(message, {
                    content: `${this.emoji("error")} ${error} provided in the \`duration\` option`
                });

                return;
            }

            durationMs = result;
        }

        try {
            const member = message.guild!.members.cache.get(user.id) ?? (await message.guild!.members.fetch(user.id));

            if (!this.client.permissionManager.shouldModerate(member, message.member! as GuildMember)) {
                await this.error(message, "You don't have permission to ban this user!");
                return;
            }
        } catch (e) {
            logError(e);
        }

        const id = await this.client.infractionManager.createUserBan(user, {
            guild: message.guild!,
            moderator: message.member!.user as User,
            deleteMessageSeconds,
            reason,
            notifyUser: context.isLegacy ? true : !context.options.getBoolean("silent"),
            sendLog: true,
            duration: durationMs,
            autoRemoveQueue: true
        });

        if (!id) {
            await this.error(message);
            return;
        }

        await this.deferredReply(
            message,
            {
                embeds: [
                    await createModerationEmbed({
                        user,
                        actionDoneName: "banned",
                        description: `**${escapeMarkdown(user.tag)}** has been banned from this server.`,
                        fields: [
                            {
                                name: "Message Deletion",
                                value: deleteMessageSeconds
                                    ? `Timeframe: ${formatDistanceToNow(
                                          new Date(Date.now() - deleteMessageSeconds * 1000)
                                      )}\nMessages in this timeframe by this user will be removed.`
                                    : "*No message will be deleted*"
                            }
                        ],
                        id: `${id}`,
                        reason
                    })
                ]
            },
            "auto"
        );
    }
}
