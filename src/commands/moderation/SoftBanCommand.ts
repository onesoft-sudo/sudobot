/*
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
import { GuildMember, PermissionsBitField, SlashCommandBuilder, User, escapeMarkdown } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { stringToTimeInterval } from "../../utils/datetime";
import { logError } from "../../utils/Logger";
import { createModerationEmbed } from "../../utils/utils";

export default class SoftBanCommand extends Command {
    public readonly name = "softban";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            entity: true,
            errors: {
                required: "You must specify a user to ban!",
                "type:invalid": "You have specified an invalid user mention or ID.",
                "entity:null": "The given user does not exist!"
            },
            name: "user"
        },
        {
            types: [ArgumentType.TimeInterval, ArgumentType.StringRest],
            optional: true,
            errors: {
                "type:invalid":
                    "You have specified an invalid argument. The system expected you to provide a ban reason or the message deletion timeframe here.",
                "time:range": "The message deletion range must be a time interval from 0 second to 604800 seconds (7 days)."
            },
            string: {
                maxLength: 3999
            },
            time: {
                min: 0,
                max: 604800
            },
            name: "timeframeOrReason",
            default: 604800
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            errors: {
                "type:invalid": "You have specified an invalid ban reason."
            },
            string: {
                maxLength: 3999
            },
            name: "reason"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.BanMembers];

    public readonly description = "Softbans a user.";
    public readonly detailedDescription =
        "This command bans a user, then unbans immediately. This is helpful if you want to remove the recent messages by a user.";
    public readonly argumentSyntaxes = ["<UserID|UserMention> [Reason]", "<UserID|UserMention> [MessageDeletionTime] [Reason]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.BanMembers];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("user").setDescription("The user").setRequired(true))
        .addStringOption(option => option.setName("reason").setDescription("The reason for softbanning this user"))
        .addStringOption(option =>
            option
                .setName("deletion_timeframe")
                .setDescription("The message deletion timeframe, defaults to 7 days (must be in range 0-7 days)")
        )
        .addBooleanOption(option =>
            option
                .setName("silent")
                .setDescription("Specify if the system should not notify the user about this action. Defaults to false")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user: User = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);

        let messageDeletionTimeframe = !context.isLegacy
            ? undefined
            : typeof context.parsedNamedArgs.timeframeOrReason === "number"
            ? context.parsedNamedArgs.timeframeOrReason
            : undefined;
        const reason = !context.isLegacy
            ? context.options.getString("reason") ?? undefined
            : typeof context.parsedNamedArgs.timeframeOrReason === "string"
            ? context.parsedNamedArgs.timeframeOrReason
            : context.parsedNamedArgs.reason;

        ifContextIsNotLegacy: if (!context.isLegacy) {
            const input = context.options.getString("deletion_timeframe");

            if (!input) break ifContextIsNotLegacy;

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

            messageDeletionTimeframe = result;
        }

        messageDeletionTimeframe ??= 604800;

        try {
            const member = message.guild!.members.cache.get(user.id) ?? (await message.guild!.members.fetch(user.id));

            if (!(await this.client.permissionManager.shouldModerate(member, message.member! as GuildMember))) {
                await this.error(message, "You don't have permission to softban this user!");
                return;
            }
        } catch (e) {
            logError(e);
        }

        const infraction = await this.client.infractionManager.createUserSoftban(user, {
            guild: message.guild!,
            moderator: message.member!.user as User,
            deleteMessageSeconds: messageDeletionTimeframe,
            reason,
            notifyUser: context.isLegacy ? true : !context.options.getBoolean("silent"),
            sendLog: true
        });

        if (!infraction) {
            await this.error(message);
            return;
        }

        await this.deferredReply(
            message,
            {
                embeds: [
                    await createModerationEmbed({
                        moderator: message.member!.user as User,
                        user,
                        actionDoneName: "softbanned",
                        description: `**${escapeMarkdown(user.tag)}** was softbanned.`,
                        fields: [
                            {
                                name: "Message Deletion",
                                value: messageDeletionTimeframe
                                    ? `Timeframe: ${formatDistanceToNow(
                                          new Date(Date.now() - messageDeletionTimeframe * 1000)
                                      )}\nMessages in this timeframe by this user will be removed.`
                                    : "*No message will be deleted*"
                            }
                        ],
                        id: `${infraction.id}`,
                        reason: infraction.reason
                    })
                ]
            },
            "auto"
        );
    }
}
