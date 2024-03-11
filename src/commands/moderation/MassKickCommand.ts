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

import { PermissionsBitField, SlashCommandBuilder, User } from "discord.js";
import Command, {
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";
import { log, logError } from "../../utils/Logger";
import { isSnowflake } from "../../utils/utils";

export default class MassKickCommand extends Command {
    public readonly name = "masskick";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.Administrator];
    public readonly aliases = ["mkick"];

    public readonly description = "Kick multiple users at the same time.";
    public readonly detailedDescription =
        "This command can kick multiple users. This is helpful if you want to quickly kick server raiders.";
    public readonly argumentSyntaxes = ["<...UserIDs|UserMentions> [Reason]"];

    public readonly botRequiredPermissions = [PermissionsBitField.Flags.Administrator];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option =>
            option.setName("users").setDescription("The users to kick").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason").setDescription("The reason for taking this action")
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            return {
                __reply: true,
                content: `${this.emoji("error")} Please specify at least 1 user to kick!`
            };
        }

        const args = context.isLegacy
            ? context.args
            : context.options.getString("users", true).split(/ +/);

        if (args.length > 10) {
            return {
                __reply: true,
                content: `${this.emoji("error")} Cannot masskick more than 10 users at once!`
            };
        }

        const members: string[] = [];
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

            members.push(id);
            position++;
        }

        await this.deferIfInteraction(message);

        let reason = context.isLegacy
            ? undefined
            : context.options.getString("reason") ?? undefined;

        if (context.isLegacy) {
            reason = "";

            for (; position < args.length; position++) {
                reason += args[position] + " ";
            }

            reason = reason.trimEnd();
        }

        const reply = await this.deferredReply(message, {
            content: `${this.emoji("loading")} Preparing to kick ${members.length} users...`
        });

        await this.client.infractionManager.createMemberMassKick({
            users: members,
            moderator: message.member!.user as User,
            reason: reason?.trim() === "" ? undefined : reason,
            sendLog: true,
            guild: message.guild!,
            callAfterEach: 5,
            abortOnTemplateNotFound: true,
            callback: async ({ completedUsers, skippedUsers, users, completedIn }) => {
                log(
                    `Kicked ${completedUsers.length} out of ${users.length} users (${skippedUsers.length} failed)`
                );

                await reply
                    .edit({
                        content: `${this.emoji(
                            completedUsers.length === users.length && completedIn
                                ? "check"
                                : "loading"
                        )} Kicked ${completedUsers.length} out of ${users.length} users (${
                            completedIn ? `Completed in ${completedIn}s, ` : ""
                        }${skippedUsers.length} failures)`
                    })
                    .catch(logError);
            }
        });
    }
}
