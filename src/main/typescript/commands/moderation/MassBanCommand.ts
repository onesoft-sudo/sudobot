/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import DurationParseError from "@framework/datetime/DurationParseError";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { userInfo } from "@framework/utils/embeds";
import { Colors } from "@main/constants/Colors";
import { Limits } from "@main/constants/Limits";
import InfractionManager from "@main/services/InfractionManager";
import {
    APIEmbed,
    ChatInputCommandInteraction,
    heading,
    HeadingLevel,
    Message,
    PermissionFlagsBits,
    Snowflake
} from "discord.js";

class MassBanCommand extends Command {
    public override readonly name = "massban";
    public override readonly description: string = "Mass ban users.";
    public override readonly detailedDescription: string =
        "Mass bans multiple users from the server.";
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly defer = true;
    public override readonly usage = ["<...users: User[]> [-r|--reason=RestString]"];
    public override readonly options = {
        "-r, --reason": "The reason for the ban."
    };
    public override readonly systemPermissions = [
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ManageGuild
    ];
    public override readonly aliases = ["mban"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("users")
                        .setDescription(
                            "The users to ban. IDs and mentions can be separated by commas."
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the ban.")
                        .setMaxLength(Limits.Reason)
                )
                .addStringOption(option =>
                    option
                        .setName("duration")
                        .setDescription("The duration of the ban.")
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName("deletion_timeframe")
                        .setDescription("The message deletion timeframe. Defaults to none.")
                        .setRequired(false)
                )
        ];
    }

    public override async execute(
        context: Context<Message<true> | ChatInputCommandInteraction>
    ): Promise<void> {
        const reasonOptionPosition = context.isLegacy()
            ? context.args.findIndex(arg => arg === "-r" || arg === "--reason")
            : undefined;
        const hasReasonOption = context.isLegacy() && reasonOptionPosition !== -1;
        const rawUsers = context.isLegacy()
            ? context.args.slice(0, !hasReasonOption ? undefined : reasonOptionPosition)
            : context.isChatInput()
              ? context.options.getString("users", true).split(/[\s,]+/)
              : [];

        if (!rawUsers?.length) {
            await context.error("You must provide at least one user to ban.");
            return;
        }

        const errors: string[] = [];
        let reason = context.isChatInput()
            ? context.options.getString("reason") ?? undefined
            : context.isLegacy() && hasReasonOption
              ? context.commandContent.slice(context.commandName.length).trimStart()
              : undefined;

        if (hasReasonOption && reason !== undefined && context.isLegacy()) {
            for (const rawUser of rawUsers) {
                reason = reason.slice(rawUser.length).trimStart();
            }

            let longOption;

            for (const arg of context.argv) {
                if (longOption) {
                    reason = reason.slice(arg.length).trimStart();
                    break;
                }

                if (arg === "--reason") {
                    longOption = true;
                } else if (arg === "-r") {
                    longOption = false;
                } else {
                    continue;
                }

                break;
            }

            reason = reason.slice((longOption ? "--reason" : "-r").length).trim();
        }

        if (hasReasonOption && !reason) {
            await context.error(
                "You must provide an argument (`reason`) to the option `-r/--reason`."
            );
            return;
        }

        const deletionTimeframeString = context.isChatInput()
            ? context.options.getString("deletion_timeframe")
            : undefined;
        let deletionTimeframe: Duration | undefined = undefined;
        const durationString = context.isChatInput()
            ? context.options.getString("duration")
            : undefined;
        let duration: Duration | undefined = undefined;

        if (deletionTimeframeString) {
            try {
                deletionTimeframe = deletionTimeframeString
                    ? Duration.fromDurationStringExpression(deletionTimeframeString)
                    : undefined;
            } catch (error) {
                if (error instanceof DurationParseError) {
                    await context.error(
                        `Error parsing message deletion timeframe: ${error.message}`
                    );
                }

                this.application.logger.debug(error);
                return;
            }
        }

        if (durationString) {
            try {
                duration = durationString
                    ? Duration.fromDurationStringExpression(durationString)
                    : undefined;
            } catch (error) {
                if (error instanceof DurationParseError) {
                    await context.error(`Error parsing duration: ${error.message}`);
                }

                this.application.logger.debug(error);
                return;
            }
        }

        const userIdSet = new Set<Snowflake>();

        for (const rawUser of rawUsers) {
            const id =
                rawUser.startsWith("<@") && rawUser.endsWith(">")
                    ? rawUser.slice(rawUser.startsWith("<@!") ? 3 : 2, -1)
                    : rawUser;

            if (!/^\d+$/.test(id)) {
                errors.push(`__Invalid user ID/mention__: ${id}`);
                continue;
            }

            userIdSet.add(id);
        }

        const userIds: Snowflake[] = Array.from(userIdSet);

        if (userIds.length > 200) {
            await context.error("You cannot mass ban more than 200 users at once.");
            return;
        }

        let message: Message;

        await this.infractionManager.createUserMassBan({
            guildId: context.guildId,
            moderator: context.user,
            users: userIds,
            reason,
            deletionTimeframe,
            duration,
            attachments: context.isLegacy() ? [...context.attachments.values()] : [],
            onMassBanStart: async () => {
                message = await context.reply({
                    embeds: [
                        this.generateEmbed({
                            context,
                            completed: [],
                            failed: [],
                            pending: userIds,
                            reason,
                            duration,
                            deletionTimeframe,
                            total: userIds.length,
                            errors
                        })
                    ]
                });
            },
            onMassBanComplete: async (bannedUsers, failedUsers, _, errorType) => {
                await message.edit({
                    embeds: [
                        this.generateEmbed({
                            context,
                            completed: bannedUsers,
                            failed: failedUsers,
                            pending: [],
                            reason,
                            duration,
                            deletionTimeframe,
                            total: userIds.length,
                            errors,
                            errorType
                        })
                    ]
                });
            }
        });
    }

    private generateEmbed({
        completed,
        context,
        failed,
        pending,
        deletionTimeframe,
        duration,
        reason,
        total,
        errors,
        errorType
    }: GenerateEmbedOptions) {
        let description =
            heading(
                errorType
                    ? `${context.emoji("error")} Error banning the users`
                    : pending.length === 0
                      ? `${context.emoji("check")} Mass banned ${completed.length}/${total} users`
                      : `${context.emoji("loading")} Mass Banning ${total} users`,
                HeadingLevel.Two
            ) + "\n";

        if (errorType) {
            if (errorType === "failed_to_ban") {
                description +=
                    "Couldn't ban any of the given users. Maybe they're already banned.\n";
            } else {
                description += "Couldn't ban any of the given users: Discord returned an error.\n";
            }
        } else {
            if (pending.length) {
                description += `Banning **${completed.length}/${total}** users...\n\n`;
            }

            for (const id of failed) {
                description += `${context.emoji("error")} <@${id}> - **Failed**\n`;
            }

            for (const id of completed) {
                description += `${context.emoji("check")} <@${id}> - **Banned**\n`;
            }

            for (const id of pending) {
                description += `${context.emoji("loading")} <@${id}> - Pending\n`;
            }

            if (failed.length) {
                description += "\n\n__Bans may fail if the users are already banned.__\n";
            }
        }

        const fields = [
            {
                name: "Reason",
                value: reason ?? "No reason provided"
            },
            {
                name: "Duration",
                value: duration?.toString() ?? "Permanent"
            }
        ];

        if (deletionTimeframe) {
            fields.push({
                name: "Deletion Timeframe",
                value: deletionTimeframe?.toString() ?? "None"
            });
        }

        if (errors?.length) {
            const value = errors.join("\n");

            fields.push({
                name: "Errors",
                value:
                    value.slice(0, 990) +
                    (value.length > 990 ? "\n(... more errors were omitted)" : "")
            });
        }

        fields.push({
            name: "Moderator",
            value: userInfo(context.user)
        });

        return {
            description:
                description.slice(0, 4000) +
                (description.length > 4000 ? "\n(... more results were omitted)" : ""),
            fields: errorType ? undefined : fields,
            color: errorType ? Colors.Red : pending.length === 0 ? Colors.Green : Colors.Primary
        } as APIEmbed;
    }
}

type GenerateEmbedOptions = {
    context: Context<CommandMessage>;
    completed: Snowflake[];
    pending: Snowflake[];
    failed: Snowflake[];
    reason?: string;
    duration?: Duration;
    deletionTimeframe?: Duration;
    total: number;
    errors: string[];
    errorType?: string;
};

export default MassBanCommand;
