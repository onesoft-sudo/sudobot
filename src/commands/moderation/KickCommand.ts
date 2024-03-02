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

import {
    ChatInputCommandInteraction,
    GuildMember,
    PermissionsBitField,
    SlashCommandBuilder,
    User,
    escapeMarkdown
} from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { createModerationEmbed } from "../../utils/utils";

export default class KickCommand extends Command {
    public readonly name = "kick";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.Member],
            entity: true,
            errors: {
                required: "You must specify a member to kick!",
                "type:invalid": "You have specified an invalid user mention or ID.",
                "entity:null": "The given member does not exist in the server!"
            },
            name: "member"
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            errors: {
                "string:rest:length:max": "The kick reason must be less than 4000 characters long."
            },
            string: {
                maxLength: 3999
            },
            name: "reason"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.KickMembers];

    public readonly description = "Kicks a server member.";
    public readonly detailedDescription = "This command kicks a server member.";
    public readonly argumentSyntaxes = ["<UserID|UserMention> [reason]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.KickMembers];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("member").setDescription("The member").setRequired(true))
        .addStringOption(option => option.setName("reason").setDescription("The reason for kicking this user"))
        .addBooleanOption(option =>
            option
                .setName("silent")
                .setDescription("Specify if the system should not notify the user about this action. Defaults to false")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const member: GuildMember | null = context.isLegacy
            ? context.parsedNamedArgs.member
            : context.options.getMember("member");

        if (!member) {
            return {
                __reply: true,
                ephemeral: true,
                content: `Invalid member given. Probably that user isn't a member of this server?`
            };
        }

        const reason: string | undefined = !context.isLegacy
            ? context.options.getString("reason") ?? undefined
            : context.parsedNamedArgs.reason ?? undefined;

        if (message instanceof ChatInputCommandInteraction) await message.deferReply();

        if (!(await this.client.permissionManager.shouldModerate(member, message.member! as GuildMember))) {
            await this.error(message, "You don't have permission to kick this user!");
            return;
        }

        const infraction = await this.client.infractionManager.createMemberKick(member, {
            guild: message.guild!,
            moderator: message.member!.user as User,
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
                        user: member.user,
                        actionDoneName: "kicked",
                        id: infraction.id,
                        reason: infraction.reason,
                        description: `**${escapeMarkdown(member.user.tag)}** has been kicked from this server.`
                    })
                ]
            },
            "auto"
        );
    }
}
