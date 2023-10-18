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

import { GuildMember, PermissionsBitField, SlashCommandBuilder, User, escapeMarkdown } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";
import { createModerationEmbed } from "../../utils/utils";

export default class UnmuteCommand extends Command {
    public readonly name = "unmute";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.GuildMember],
            entityNotNull: true,
            requiredErrorMessage: "You must specify a member to unmute!",
            typeErrorMessage: "You have specified an invalid member mention or ID.",
            entityNotNullErrorMessage: "The given member does not exist!",
            name: "member"
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            typeErrorMessage: "You have specified an invalid unmute reason.",
            lengthMax: 3999,
            name: "reason"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers];

    public readonly description = "Unmutes a server member.";
    public readonly detailedDescription =
        "This command unmutes a server member. The muted role needs to be configured for this command to work!";
    public readonly argumentSyntaxes = ["<UserID|UserMention> [reason]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.ModerateMembers];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("member").setDescription("The member").setRequired(true))
        .addStringOption(option => option.setName("reason").setDescription("The reason for unmuting this user"))
        .addBooleanOption(option =>
            option
                .setName("silent")
                .setDescription("Specify if the system should not notify the user about this action. Defaults to false")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const member: GuildMember = context.isLegacy ? context.parsedNamedArgs.member : context.options.getMember("member");

        if (!member) {
            return {
                __reply: true,
                ephemeral: true,
                content: `${this.emoji("error")} Invalid member specified.`
            };
        }

        await this.deferIfInteraction(message);
        const reason: string | undefined =
            (!context.isLegacy ? context.options.getString("reason") : context.parsedNamedArgs.reason) ?? undefined;

        if (!this.client.permissionManager.shouldModerate(member, message.member! as GuildMember)) {
            await this.error(message, "You don't have permission to unmute this user!");
            return;
        }

        const { id } = <any>await this.client.infractionManager
            .removeMemberMute(member, {
                guild: message.guild!,
                moderator: message.member!.user as User,
                notifyUser: !context.isLegacy ? !context.options.getBoolean("silent") ?? true : true,
                reason,
                sendLog: true
            })
            .catch(logError);

        if (!id) {
            await this.error(message);
            return;
        }

        await this.deferredReply(
            message,
            {
                embeds: [
                    await createModerationEmbed({
                        user: member.user,
                        actionDoneName: "unmuted",
                        description: `**${escapeMarkdown(member.user.tag)}** has been unmuted.`,
                        id: `${id}`,
                        reason,
                        color: "Green"
                    })
                ]
            },
            "auto"
        );
    }
}
