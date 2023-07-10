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

import { ChatInputCommandInteraction, PermissionsBitField, User, escapeMarkdown } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { createModerationEmbed } from "../../utils/utils";

export default class WarnCommand extends Command {
    public readonly name = "warn";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.GuildMember],
            entityNotNull: true,
            requiredErrorMessage: "You must specify a member to warn!",
            typeErrorMessage: "You have specified an invalid user mention or ID.",
            entityNotNullErrorMessage: "The given member does not exist in the server!",
            name: "member"
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            typeErrorMessage: "You have specified an invalid warning reason.",
            lengthMax: 3999,
            name: "reason"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const member = context.isLegacy ? context.parsedNamedArgs.member : context.options.getMember('member');

        if (!member) {
            await message.reply({
                ephemeral: true,
                content: "The member is invalid or does not exist."
            });

            return;
        }

        if (message instanceof ChatInputCommandInteraction) {
            await message.deferReply();
        }

        const reason = (context.isLegacy ? context.parsedNamedArgs.reason : context.options.getString('reason')) ?? undefined;

        const { id, result } = await this.client.infractionManager.createMemberWarn(member, {
            guild: message.guild!,
            moderator: message.member!.user as User,
            notifyUser: true,
            reason,
            sendLog: true
        });

        await this.deferredReply(message, {
            embeds: [
                await createModerationEmbed({
                    user: member.user,
                    description: `**${escapeMarkdown(member.user.tag)}** has been warned.${!result ? '\nFailed to deliver a DM to the user, they will not know about this warning.' : ''}`,
                    actionDoneName: 'warned',
                    id,
                    reason,
                })
            ]
        });
    }
}
