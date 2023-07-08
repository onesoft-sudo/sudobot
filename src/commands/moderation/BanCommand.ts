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
import { ChatInputCommandInteraction, PermissionsBitField, User, escapeMarkdown } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
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
            typeErrorMessage: "You have specified an invalid argument. The system expected you to provide a ban reason or the message deletion range here.",
            minValue: 0,
            maxValue: 604800,
            lengthMax: 3999
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            typeErrorMessage: "You have specified an invalid ban reason.",
            lengthMax: 3999
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.BanMembers];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        if (message instanceof ChatInputCommandInteraction)
            await message.deferReply();

        const user: User = context.isLegacy ? context.parsedArgs[0] : context.options.getUser("user", true);
        const deleteMessageSeconds = !context.isLegacy ? context.options.getInteger("days") ?? undefined : (
            typeof context.parsedArgs[1] === 'number' ? context.parsedArgs[1] : undefined
        );
        const reason = !context.isLegacy ? context.options.getString('reason') ?? undefined : (
            typeof context.parsedArgs[1] === 'string' ? context.parsedArgs[1] : context.parsedArgs[2]
        );

        const id = await this.client.infractionManager.createUserBan(user, {
            guild: message.guild!,
            moderatorId: message.member!.user.id,
            deleteMessageSeconds: deleteMessageSeconds,
            reason,
            notifyUser: context.isLegacy ? true : !context.options.getBoolean('silent'),
            sendLog: true
        });

        if (!id) {
            await this.error(message);
            return;
        }

        await this.deferredReply(message, {
            embeds: [
                await createModerationEmbed({
                    user,
                    actionDoneName: "banned",
                    description: `**${escapeMarkdown(user.tag)}** has been banned from this server.`,
                    fields: [
                        {
                            name: 'Message Deletion',
                            value: deleteMessageSeconds ? `Timeframe: ${formatDistanceToNow(new Date(Date.now() - (deleteMessageSeconds * 1000)))}\nMessages in this timeframe by this user will be removed.` : "*No message will be deleted*"
                        },
                    ],
                    id: `${id}`,
                    reason
                })
            ]
        });
    }
}