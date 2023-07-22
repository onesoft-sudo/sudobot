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

import {
    Channel,
    ChatInputCommandInteraction,
    Message,
    PermissionsBitField,
    SlashCommandBuilder,
    TextChannel,
    User
} from "discord.js";
import Command, {
    AnyCommandContext,
    ArgumentType,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";
import { logError } from "../../utils/logger";
import { isTextableChannel } from "../../utils/utils";

export default class ClearCommand extends Command {
    public readonly name = "clear";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User, ArgumentType.Integer],
            entityNotNull: true,
            entityNotNullErrorMessage: "This user does not exist! If it's an ID, make sure it's correct!",
            name: "countOrUser",
            requiredErrorMessage: "You must specify the count of messages to delete or a user to delete messages from!",
            typeErrorMessage: "Please either specify a message count or user at position 1!",
            minValue: 0,
            maxValue: 100,
            minMaxErrorMessage: "The message count must be a number between 0 to 100"
        },
        {
            types: [ArgumentType.Integer],
            optional: true,
            name: "count",
            typeErrorMessage: "Please specify a valid message count at position 2!",
            minValue: 0,
            maxValue: 100,
            minMaxErrorMessage: "The message count must be a number between 0 to 100"
        },
        {
            types: [ArgumentType.Channel],
            optional: true,
            entityNotNull: true,
            entityNotNullErrorMessage: "This channel does not exist! If it's an ID, make sure it's correct!",
            name: "channel",
            typeErrorMessage: "Please specify a valid text channel at position 3!",
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];

    public readonly description = "Clear messages in bulk.";
    public readonly detailedDscription = "This command clears messages in bulk, by user or by count or both. This operation may take some time to complete.";
    public readonly argumentSyntaxes = [
        "<count>",
        "<UserID|UserMention> [count]",
    ];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.ManageMessages];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName('user').setDescription("The user"))
        .addIntegerOption(option => option.setName('count').setDescription("The amount of messages to delete").setMaxValue(100).setMinValue(2))
        .addChannelOption(option => option.setName('channel').setDescription("The channel where the messages will be deleted"));

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const count: number | undefined = !context.isLegacy ? context.options.getInteger('count') ?? undefined : (
            typeof context.parsedNamedArgs.countOrUser === 'number' ? context.parsedNamedArgs.countOrUser : context.parsedNamedArgs.count
        );

        const user: User | undefined = !context.isLegacy ? context.options.getUser('user') ?? undefined : (
            typeof context.parsedNamedArgs.countOrUser !== 'number' ? context.parsedNamedArgs.countOrUser : undefined
        );

        const channel: Channel | undefined = !context.isLegacy ? context.options.getChannel('channel') ?? undefined : context.parsedNamedArgs.channel ?? undefined;

        if (channel && !isTextableChannel(channel)) {
            return {
                __reply: true,
                content: `${this.emoji('error')} The given channel is not a text channel`
            };
        }

        if ((!count && count !== 0) && !user) {
            return {
                __reply: true,
                content: `${this.emoji('error')} Please specify a user or message count, otherwise the system cannot determine how many messages to delete!`
            };
        }

        if (message instanceof Message) {
            await message.delete().catch(logError);
        }

        await this.deferIfInteraction(message);

        await this.client.infractionManager.bulkDeleteMessages({
            user,
            guild: message.guild!,
            reason: undefined,
            sendLog: true,
            moderator: message.member!.user as User,
            notifyUser: false,
            messageChannel: message.channel! as TextChannel,
            count
        });

        if (message instanceof ChatInputCommandInteraction)
            await message.editReply(`${this.emoji('check')} Operation completed.`);
    }
}
