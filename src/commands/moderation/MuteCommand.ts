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
import {
    ChatInputCommandInteraction,
    GuildMember,
    PermissionsBitField,
    SlashCommandBuilder,
    User,
    escapeMarkdown
} from "discord.js";
import Command, {
    ArgumentType,
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";
import { stringToTimeInterval } from "../../utils/datetime";
import { createModerationEmbed } from "../../utils/utils";

export default class MuteCommand extends Command {
    public readonly name = "mute";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.Member],
            entity: true,
            errors: {
                required: "You must specify a member to mute!",
                "type:invalid": "You have specified an invalid user mention or ID.",
                "entity:null": "The given member does not exist in the server!"
            },
            name: "member"
        },
        {
            types: [ArgumentType.TimeInterval, ArgumentType.StringRest],
            optional: true,
            errors: {
                "time:range": "The mute duration must be a valid time interval.",
                "type:invalid":
                    "You have specified an invalid argument. The system expected you to provide a mute reason or the mute duration here."
            },
            string: {
                maxLength: 3999
            },
            name: "durationOrReason"
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            errors: {
                "type:invalid":
                    "You have specified an invalid argument. The system expected you to provide a mute reason or the mute duration here."
            },
            string: {
                maxLength: 3999
            },
            name: "reason"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers];

    public readonly description = "Mutes a server member.";
    public readonly detailedDescription =
        "This command mutes a server member. You can specify a duration or make it indefinite. The muted role needs to be configured for this command to work!";
    public readonly argumentSyntaxes = [
        "<UserID|UserMention> [reason]",
        "<UserID|UserMention> [duration] [reason]"
    ];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.ModerateMembers];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option =>
            option.setName("member").setDescription("The member").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason").setDescription("The reason for muting this user")
        )
        .addStringOption(option => option.setName("time").setDescription("Mute duration"))
        .addBooleanOption(option =>
            option
                .setName("hardmute")
                .setDescription(
                    "Specify if the system should take out all roles of the user during the mute"
                )
        )
        .addBooleanOption(option =>
            option
                .setName("silent")
                .setDescription(
                    "Specify if the system should not notify the user about this action. Defaults to false"
                )
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const member = context.isLegacy
            ? context.parsedNamedArgs.member
            : context.options.getMember("member");

        if (!member) {
            await message.reply({
                ephemeral: true,
                content: "The member is invalid or does not exist."
            });

            return;
        }
        let duration =
            (!context.isLegacy
                ? context.options.getString("time") ?? undefined
                : typeof context.parsedNamedArgs.durationOrReason === "number"
                ? context.parsedNamedArgs.durationOrReason
                : undefined) ?? undefined;

        if (typeof duration === "string") {
            const { error, result } = stringToTimeInterval(duration);

            if (error) {
                await message.reply({
                    ephemeral: true,
                    content: error
                });

                return;
            }

            duration = result;
        }

        const reason =
            (!context.isLegacy
                ? context.options.getString("reason") ?? undefined
                : typeof context.parsedNamedArgs.durationOrReason === "string"
                ? context.parsedNamedArgs.durationOrReason
                : typeof context.parsedNamedArgs.durationOrReason === "number"
                ? (context.parsedNamedArgs.reason as string | undefined)
                : undefined) ?? undefined;

        if (message instanceof ChatInputCommandInteraction) {
            await message.deferReply();
        }

        if (
            !(await this.client.permissionManager.shouldModerate(
                member,
                message.member! as GuildMember
            ))
        ) {
            await this.error(message, "You don't have permission to mute this user!");
            return;
        }

        const {
            id,
            result,
            error,
            reason: finalReason
        } = await this.client.infractionManager.createMemberMute(member, {
            guild: message.guild!,
            moderator: message.member!.user as User,
            notifyUser: !context.isLegacy ? !context.options.getBoolean("silent") ?? true : true,
            reason,
            sendLog: true,
            duration: duration
                ? duration * 1000
                : undefined /* Convert the duration from seconds to milliseconds */,
            autoRemoveQueue: true,
            abortOnTemplateNotFound: true
        });

        if (error || !id) {
            await this.deferredReply(message, {
                content:
                    error ??
                    "An error has occurred during role assignment. Please double check the bot permissions."
            });

            return;
        }

        await this.deferredReply(
            message,
            {
                embeds: [
                    await createModerationEmbed({
                        moderator: message.member!.user as User,
                        user: member.user,
                        description: `**${escapeMarkdown(member.user.tag)}** has been muted.${
                            result === false
                                ? "\nFailed to deliver a DM to the user, and the fallback channel could not be created. The user will not know about this mute."
                                : result === null
                                ? "\nCould not deliver a DM since the user is not in the server. They will not know about this mute"
                                : ""
                        }`,
                        actionDoneName: "muted",
                        id,
                        reason: finalReason,
                        fields: [
                            {
                                name: "Duration",
                                value: duration
                                    ? formatDistanceToNowStrict(
                                          new Date(Date.now() - duration * 1000)
                                      )
                                    : "*No duration set*"
                            }
                        ]
                    })
                ]
            },
            "auto"
        );
    }
}
