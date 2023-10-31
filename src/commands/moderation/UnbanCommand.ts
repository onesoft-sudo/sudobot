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

export default class UnbanCommand extends Command {
    public readonly name = "unban";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            entityNotNull: true,
            requiredErrorMessage: "You must specify a user to unban!",
            typeErrorMessage: "You have specified an invalid user mention or ID.",
            entityNotNullErrorMessage: "The given user does not exist!",
            name: "user"
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            typeErrorMessage: "You have specified an invalid unban reason.",
            lengthMax: 3999,
            name: "reason"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.BanMembers];

    public readonly description = "Unbans a user.";
    public readonly detailedDescription = "This command unbans the given user.";
    public readonly argumentSyntaxes = ["<UserID|UserMention> [Reason]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.BanMembers];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("user").setDescription("The user").setRequired(true))
        .addStringOption(option => option.setName("reason").setDescription("The reason for unbanning this user"));

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user: User = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);
        const reason: string | undefined =
            (!context.isLegacy ? context.options.getString("reason") : context.parsedNamedArgs.reason) ?? undefined;

        try {
            const member = message.guild!.members.cache.get(user.id) ?? (await message.guild!.members.fetch(user.id));

            if (!this.client.permissionManager.shouldModerate(member, message.member! as GuildMember)) {
                await this.error(message, "You don't have permission to unban this user!");
                return;
            }
        } catch (e) {
            logError(e);
        }

        const { id, noSuchBan } = await this.client.infractionManager.removeUserBan(user, {
            guild: message.guild!,
            moderator: message.member!.user! as User,
            reason,
            sendLog: true
        });

        if (noSuchBan) {
            await this.error(message, "This user wasn't banned.");
            return;
        }

        if (!id) {
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
                        actionDoneName: "unbanned",
                        description: `**${escapeMarkdown(user.tag)}** has been unbanned.`,
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
