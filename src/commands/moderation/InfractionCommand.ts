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

import { InfractionType } from "@prisma/client";
import { MessageMentions, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { safeUserFetch } from "../../utils/fetch";
import { isSnowflake } from "../../utils/utils";

const infractionTypes = [
    {
        name: "Ban",
        value: InfractionType.BAN
    },
    {
        name: "Kick",
        value: InfractionType.KICK
    },
    {
        name: "Mute",
        value: InfractionType.MUTE
    },
    {
        name: "Warning",
        value: InfractionType.WARNING
    },
    {
        name: "Unmute",
        value: InfractionType.UNMUTE
    },
    {
        name: "Unban",
        value: InfractionType.UNBAN
    },
    {
        name: "Bulk message delete",
        value: InfractionType.BULK_DELETE_MESSAGE
    },
    {
        name: "Temporary Ban",
        value: InfractionType.TEMPBAN
    },
    {
        name: "Softban",
        value: InfractionType.SOFTBAN
    },
    {
        name: "Timeout",
        value: InfractionType.TIMEOUT
    },
    {
        name: "Timeout remove",
        value: InfractionType.TIMEOUT_REMOVE
    },
    {
        name: "Note",
        value: InfractionType.TIMEOUT_REMOVE
    }
].map(o => ({ ...o, value: o.value.toLowerCase() }));

export default class InfractionCommand extends Command {
    public readonly name = "infraction";
    public readonly subcommands = ["view", "create", "edit", "delete", "list", "clear", "s", "l"];
    public readonly subcommandShortList = ["view", "create", "edit", "delete", "list", "clear"];
    public readonly subCommandCheck = true;
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "subcommand",
            errors: {
                required: `Please provide a valid subcommand! The available subcommands are: \`${this.subcommandShortList.join(
                    "`, `"
                )}\`.`
            }
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "Manage infractions.";
    public readonly detailedDescription = "Use this command to manage infractions.";
    public readonly argumentSyntaxes = ["<subcommand> [...args]"];
    public readonly aliases = ["i", "inf", "infs"];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("View information about an infraction")
                .addIntegerOption(option => option.setName("id").setDescription("The infraction ID").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("edit")
                .setDescription("Update reason/duration of an infraction")
                .addIntegerOption(option => option.setName("id").setDescription("The infraction ID").setRequired(true))
                .addStringOption(option => option.setName("new_reason").setDescription("New reason to set"))
                .addStringOption(option => option.setName("new_duration").setDescription("New duration to set"))
                .addBooleanOption(option =>
                    option
                        .setName("silent")
                        .setDescription("Specify if the bot should not let the user know about this, defaults to true")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Delete an infraction")
                .addIntegerOption(option => option.setName("id").setDescription("The infraction ID").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("clear")
                .setDescription("Clear infractions for a user")
                .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Specify infraction type")
                        .setChoices(...infractionTypes)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("List infractions for a user")
                .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Add infractions to a user")
                .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Specify infraction type")
                        .setChoices(...infractionTypes)
                        .setRequired(true)
                )
                .addStringOption(option => option.setName("reason").setDescription("The reason for giving this infraction"))
                .addStringOption(option =>
                    option.setName("duration").setDescription("The duration of this infraction (e.g. 45, 1h30m)")
                )
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const subcommand = context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true);

        if ((subcommand === "edit" || subcommand === "create") && context.isLegacy) {
            await message.reply(
                `${this.emoji("error")} Please use the slash command \`/infraction ${subcommand}\` to perform this action.`
            );
            return;
        }

        if (["clear", "list", "s", "l"].includes(subcommand)) {
            if (context.isLegacy && !context.args[1]) {
                await message.reply(`${this.emoji("error")} Please provide a user to perform this action!`);
                return;
            }

            if (context.isLegacy) {
                let userId = "";

                if (isSnowflake(context.args[1])) {
                    userId = context.args[1];
                } else if (MessageMentions.UsersPattern.test(context.args[1])) {
                    userId = context.args[1].substring(context.args[1].includes("!") ? 3 : 2, context.args[1].length - 1);
                } else {
                    await message.reply(
                        `${this.emoji("error")} Please provide a valid user mention or ID to perform this action!`
                    );
                    return;
                }

                const user = await safeUserFetch(this.client, userId);

                if (!user) {
                    await message.reply(`${this.emoji("error")} That user does not exist!`);
                    return;
                }

                context.parsedNamedArgs.user = user;
            }
        } else {
            if (context.isLegacy && !context.args[1]) {
                await message.reply(`${this.emoji("error")} Please provide an infraction ID to perform this action!`);
                return;
            }

            if (context.isLegacy && isNaN(parseInt(context.args[1]))) {
                await message.reply(`${this.emoji("error")} Please provide a __valid__ infraction ID to perform this action!`);
                return;
            }

            if (context.isLegacy) context.parsedNamedArgs.id = parseInt(context.args[1]);
        }

        await this.deferIfInteraction(message);

        const command = this.client.commands.get(`infraction__${subcommand}`);

        if (command) {
            return await command.execute(message, {
                ...context
            });
        }
    }
}
