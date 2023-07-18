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

import { GuildMember, escapeMarkdown } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
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
    public readonly permissions = [];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const member: GuildMember = context.isLegacy ? context.parsedNamedArgs.member : context.options.getMember("member");

        if (!member) {
            return {
                __reply: true,
                ephemeral: true,
                content: `${this.emoji("error")} Invalid member specified.`
            };
        }

        await this.deferIfInteraction(message);
        const reason: string | undefined = (!context.isLegacy ? context.options.getString('reason') : context.parsedNamedArgs.reason) ?? undefined;

        const { id } = <any>await this.client.infractionManager.removeMemberMute(member, {
            guild: message.guild!,
            moderator: this.client.user!,
            notifyUser: !context.isLegacy ? !context.options.getBoolean('silent') ?? true : true,
            reason,
            sendLog: true,
        }).catch(logError);

        if (!id) {
            await this.error(message);
            return;
        }

        await this.deferredReply(message, {
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
        });
    }
}
