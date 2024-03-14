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

import { GuildMember, PermissionsBitField, SlashCommandBuilder, User } from "discord.js";
import { log, logError } from "../../components/log/Logger";
import Command, {
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";
import { stringToTimeInterval } from "../../utils/datetime";
import { isSnowflake } from "../../utils/utils";

export default class MassBanCommand extends Command {
    public readonly name = "massban";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.Administrator];
    public readonly aliases = ["mban"];

    public readonly description = "Ban multiple users at the same time.";
    public readonly detailedDescription =
        "This command can ban multiple users. This is helpful if you want to quickly ban server raiders. The message deletion timeframe is 7 days by default.";
    public readonly argumentSyntaxes = ["<...UserIDs|UserMentions> [Reason]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.Administrator];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option =>
            option.setName("users").setDescription("The users to ban").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason").setDescription("The reason for taking this action")
        )
        .addStringOption(option =>
            option
                .setName("deletion_timeframe")
                .setDescription("The message deletion timeframe (must be in range 0-604800)")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            return {
                __reply: true,
                content: `${this.emoji("error")} Please specify at least 1 user to ban!`
            };
        }

        const args = context.isLegacy
            ? context.args
            : context.options.getString("users", true).split(/ +/);

        if (args.length > 20) {
            return {
                __reply: true,
                content: `${this.emoji("error")} Cannot massban more than 20 users at once!`
            };
        }

        const users: string[] = [];
        let position = 0;

        for (const arg of args) {
            let id: string | undefined = undefined;

            if (isSnowflake(arg)) {
                id = arg;
            } else if (arg.startsWith("<@") && arg.endsWith(">")) {
                id = arg.substring(arg.includes("!") ? 3 : 2, arg.length - 1);
            }

            if (id && !isSnowflake(id)) {
                return {
                    __reply: true,
                    content: `\`${id}\` is not a valid user mention format or the ID is incorrect.`
                };
            }

            if (!id) break;

            users.push(id);
            position++;
        }

        await this.deferIfInteraction(message);

        let reason = context.isLegacy
            ? undefined
            : context.options.getString("reason") ?? undefined;
        let deleteMessageSeconds = context.isLegacy ? 604800 : undefined;

        ifContextIsNotLegacy: if (!context.isLegacy) {
            const input = context.options.getString("deletion_timeframe");

            if (!input) break ifContextIsNotLegacy;

            const { result, error } = stringToTimeInterval(input);

            if (error) {
                await this.deferredReply(message, {
                    content: `${this.emoji(
                        "error"
                    )} ${error} provided in the \`deletion_timeframe\` option`
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

            deleteMessageSeconds = result;
        }

        if (context.isLegacy) {
            reason = "";

            for (; position < args.length; position++) {
                reason += args[position] + " ";
            }

            reason = reason.trimEnd();
        }

        for (const user of users) {
            try {
                const member =
                    message.guild!.members.cache.get(user) ??
                    (await message.guild!.members.fetch(user));

                log("Fetched member to check permissions");

                if (
                    !(await this.client.permissionManager.shouldModerate(
                        member,
                        message.member! as GuildMember
                    ))
                ) {
                    await this.deferredReply(message, {
                        content: `${this.emoji(
                            "error"
                        )} You don't have permission to ban ${member.user.toString()}!`,
                        allowedMentions: {
                            users: []
                        }
                    });

                    return;
                }
            } catch (e) {
                logError(e);
            }
        }

        const reply = await this.deferredReply(message, {
            content: `${this.emoji("loading")} Preparing to ban ${users.length} users...`
        });

        await this.client.infractionManager.createUserMassBan({
            users,
            moderator: message.member!.user as User,
            reason: reason?.trim() === "" ? undefined : reason,
            sendLog: true,
            guild: message.guild!,
            deleteMessageSeconds,
            callAfterEach: 10,
            abortOnTemplateNotFound: true,
            callback: async ({ completedUsers, skippedUsers, users, completedIn }) => {
                log(
                    `Banned ${completedUsers.length} out of ${users.length} users (${skippedUsers.length} failed)`
                );

                await reply
                    .edit({
                        content: `${this.emoji(
                            completedUsers.length === users.length && completedIn
                                ? "check"
                                : "loading"
                        )} Banned ${completedUsers.length} out of ${users.length} users (${
                            completedIn ? `Completed in ${completedIn}s, ` : ""
                        }${skippedUsers.length} failures)`
                    })
                    .catch(logError);
            }
        });
    }
}
