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
    GuildMember,
    Message,
    PermissionsBitField,
    SlashCommandBuilder,
    TextChannel,
    User
} from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";
import { isTextableChannel } from "../../utils/utils";

const THREE_DAYS = 1000 * 60 * 60 * 24 * 3;

const filters = {
    bots: (message: Message) => message.author.bot,
    unverified_bots: (message: Message) => message.author.bot && !message.author.flags?.has("VerifiedBot"),
    users: (message: Message) => !message.author.bot,
    new_users: (message: Message) => !message.author.bot && message.createdAt.getTime() <= THREE_DAYS,
    embeds: (message: Message) => message.embeds.length > 0
};

const filter_aliases: Record<string, keyof typeof filters> = {
    bc: "bots",
    hc: "users",
    ec: "embeds",
    nc: "new_users"
};

export default class ClearCommand extends Command {
    public readonly name = "clear";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User, ArgumentType.Integer],
            entity: {
                notNull: true
            },
            name: "countOrUser", // TODO: Be sure to support multiple names for the same argument
            errors: {
                "entity:null": "This user does not exist! If it's an ID, make sure it's correct!",
                required: "You must specify the count of messages to delete or a user to delete messages from!",
                "type:invalid": "Please either specify a message count or user at position 1!",
                "number:range": "The message count must be a number between 0 to 100"
            },
            number: {
                min: 0,
                max: 100
            },
            optional: true
        },
        {
            types: [ArgumentType.Integer],
            optional: true,
            name: "count",
            errors: {
                "type:invalid": "Please specify a valid message count at position 2!",
                "number:range": "The message count must be a number between 0 to 100"
            },
            number: {
                min: 0,
                max: 100
            }
        },
        {
            types: [ArgumentType.Channel],
            optional: true,
            entity: {
                notNull: true
            },
            errors: {
                "entity:null": "This channel does not exist! If it's an ID, make sure it's correct!",
                "type:invalid": "Please specify a valid text channel at position 3!"
            },
            name: "channel"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly aliases = ["purge", "bulkdel", "bulkdelete", "bc", "hc", "ec", "nc"];

    public readonly description = "Clear messages in bulk.";
    public readonly detailedDescription =
        "This command clears messages in bulk, by user or by count or both. This operation may take some time to complete.";
    public readonly argumentSyntaxes = ["<count>", "<UserID|UserMention> [count]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.ManageMessages];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("user").setDescription("The user"))
        .addIntegerOption(option =>
            option.setName("count").setDescription("The amount of messages to delete").setMaxValue(100).setMinValue(2)
        )
        .addChannelOption(option => option.setName("channel").setDescription("The channel where the messages will be deleted"))
        .addBooleanOption(option => option.setName("filter_bots").setDescription("Deletes messages from bots"))
        .addBooleanOption(option => option.setName("filter_users").setDescription("Deletes messages from human users only"))
        .addBooleanOption(option => option.setName("filter_new_users").setDescription("Deletes messages from new users"))
        .addBooleanOption(option => option.setName("filter_embeds").setDescription("Deletes messages that have embeds"))
        .addBooleanOption(option =>
            option.setName("filter_unverifed_bots").setDescription("Deletes messages from unverified bots")
        )
        .addStringOption(option =>
            option.setName("filter_pattern").setDescription("Deletes messages matching with this regex pattern")
        )
        .addStringOption(option =>
            option.setName("filter_pattern_flags").setDescription("Flags for the regex pattern. Defaults to 'g' (global)")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const isPrimaryCommand = !context.isLegacy
            ? !!context.options.data.find(option => option.name.startsWith("filter_"))
            : context.argv[0].length > 2;

        let count: number | undefined = !context.isLegacy
            ? context.options.getInteger("count") ?? undefined
            : typeof context.parsedNamedArgs.countOrUser === "number"
            ? context.parsedNamedArgs.countOrUser
            : context.parsedNamedArgs.count;

        const user: User | undefined = !context.isLegacy
            ? context.options.getUser("user") ?? undefined
            : typeof context.parsedNamedArgs.countOrUser !== "number"
            ? context.parsedNamedArgs.countOrUser
            : undefined;

        if (!count && count !== 0 && !user) {
            if (isPrimaryCommand) {
                return {
                    __reply: true,
                    content: `${this.emoji(
                        "error"
                    )} Please specify a user or message count, otherwise the system cannot determine how many messages to delete!`
                };
            } else {
                count = 20;
            }
        }

        const channel: Channel | undefined = !context.isLegacy
            ? context.options.getChannel("channel") ?? undefined
            : context.parsedNamedArgs.channel ?? undefined;

        if (channel && !isTextableChannel(channel)) {
            return {
                __reply: true,
                content: `${this.emoji("error")} The given channel is not a text channel`
            };
        }

        if (message instanceof ChatInputCommandInteraction) {
            if (message.options.getString("filter_pattern_flags") && !message.options.getString("filter_pattern")) {
                await this.error(message, `Option \`filter_pattern\` must be present when \`filter_pattern_flags\` is set.`);
                return;
            }
        }

        if (user) {
            try {
                const member = message.guild!.members.cache.get(user.id) ?? (await message.guild!.members.fetch(user.id));

                if (!this.client.permissionManager.shouldModerate(member, message.member! as GuildMember)) {
                    await this.error(message, "You don't have permission to clear messages from this user!");
                    return;
                }
            } catch (e) {
                logError(e);
            }
        }

        if (message instanceof Message) {
            await message.delete().catch(logError);
        }

        await this.deferIfInteraction(message, {
            ephemeral: true
        });

        const filterHandlers = [];

        if (message instanceof ChatInputCommandInteraction) {
            for (const option of message.options.data) {
                if (!option.name.startsWith("filter_") || !option.value) {
                    continue;
                }

                const filter = filters[option.name.replace("filter_", "") as keyof typeof filters];

                if (filter) {
                    filterHandlers.push(filter);
                } else {
                    if (option.name === "filter_pattern" && message.options.getString("filter_pattern")) {
                        try {
                            const regex = new RegExp(
                                message.options.getString("filter_pattern", true),
                                message.options.getString("filter_pattern_flags") ?? "g"
                            );

                            filterHandlers.push((message: Message) => regex.test(message.content));
                        } catch (e) {
                            logError(e);
                            await this.error(message, "Invalid flag(s) supplied for the regex pattern");
                            return;
                        }
                    }
                }
            }
        } else if (context.isLegacy) {
            const aliasHandlerName = filter_aliases[context.argv[0]];

            if (aliasHandlerName) {
                const aliasHandler = filters[aliasHandlerName];

                if (aliasHandler) {
                    filterHandlers.push(aliasHandler);
                }
            }
        }

        await this.client.infractionManager.bulkDeleteMessages({
            user,
            guild: message.guild!,
            reason: undefined,
            sendLog: true,
            moderator: message.member!.user as User,
            notifyUser: false,
            messageChannel: message.channel! as TextChannel,
            count,
            filters: filterHandlers
        });

        if (message instanceof ChatInputCommandInteraction)
            await message.editReply(`${this.emoji("check")} Operation completed.`);
    }
}
