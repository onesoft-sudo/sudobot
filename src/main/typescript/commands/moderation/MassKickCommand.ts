/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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
import { setTimeout } from "timers/promises";

class MassKickCommand extends Command {
    public override readonly name = "masskick";
    public override readonly description: string = "Mass kick members.";
    public override readonly detailedDescription: string =
        "Mass kicks multiple members from the server.";
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly defer = true;
    public override readonly usage = ["<...members: GuildMember[]> [-r|--reason=RestString]"];
    public override readonly options = {
        "-r, --reason": "The reason for the kick."
    };
    public override readonly systemPermissions = [PermissionFlagsBits.KickMembers];
    public override readonly aliases = ["mkick"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("members")
                        .setDescription(
                            "The members to ban. IDs and mentions can be separated by commas."
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the kick.")
                        .setMaxLength(Limits.Reason)
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
        const rawMembers = context.isLegacy()
            ? context.args.slice(0, !hasReasonOption ? undefined : reasonOptionPosition)
            : context.isChatInput()
              ? context.options.getString("members", true).split(/[\s,]+/)
              : [];

        if (!rawMembers?.length) {
            await context.error("You must provide at least one member to kick.");
            return;
        }

        const errors: string[] = [];
        let reason = context.isChatInput()
            ? context.options.getString("reason") ?? undefined
            : context.isLegacy() && hasReasonOption
              ? context.commandContent.slice(context.commandName.length).trimStart()
              : undefined;

        if (hasReasonOption && reason !== undefined && context.isLegacy()) {
            for (const rawMember of rawMembers) {
                reason = reason.slice(rawMember.length).trimStart();
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

        const memberIdSet = new Set<Snowflake>();

        for (const rawMember of rawMembers) {
            const id =
                rawMember.startsWith("<@") && rawMember.endsWith(">")
                    ? rawMember.slice(rawMember.startsWith("<@!") ? 3 : 2, -1)
                    : rawMember;

            if (!/^\d+$/.test(id)) {
                errors.push(`__Invalid member ID/mention__: ${id}`);
                continue;
            }

            memberIdSet.add(id);
        }

        const memberIds: Snowflake[] = Array.from(memberIdSet);

        if (memberIds.length > 200) {
            await context.error("You cannot mass kick more than 200 users at once.");
            return;
        }

        let message: Message;

        const completed: Snowflake[] = [];
        const failed: Snowflake[] = [];

        let count = 0;

        await this.infractionManager.createUserMassKick({
            guildId: context.guildId,
            moderator: context.user,
            members: memberIds,
            onKickAttempt: async () => {
                if (count % 20 === 0) {
                    await setTimeout(3000);
                }

                count++;

                if (count % 10 === 0) {
                    await message.edit({
                        embeds: [
                            this.generateEmbed({
                                context,
                                completed,
                                failed,
                                pending: memberIds.filter(
                                    id => !completed.includes(id) || failed.includes(id)
                                ),
                                reason,
                                total: memberIds.length,
                                errors
                            })
                        ]
                    });
                }
            },
            onKickSuccess(user) {
                completed.push(user.id);
            },
            onKickFail(user) {
                failed.push(user.id);
            },
            onInvalidMember(userId) {
                errors.push(`__Invalid member__: ${userId}`);
            },
            onMassKickStart: async () => {
                message = await context.reply({
                    embeds: [
                        this.generateEmbed({
                            context,
                            completed: [],
                            failed: [],
                            pending: memberIds,
                            reason,
                            total: memberIds.length,
                            errors
                        })
                    ]
                });
            },
            onMassKickComplete: async () => {
                await message.edit({
                    embeds: [
                        this.generateEmbed({
                            context,
                            completed,
                            failed,
                            pending: [],
                            reason,
                            total: memberIds.length,
                            errors
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
        reason,
        total,
        errors
    }: GenerateEmbedOptions) {
        let description =
            heading(
                pending.length === 0
                    ? `${context.emoji("check")} Mass banned ${completed.length}/${total} users`
                    : `${context.emoji("loading")} Mass Banning ${total} users`,
                HeadingLevel.Two
            ) + "\n";

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

        const fields = [
            {
                name: "Reason",
                value: reason ?? "No reason provided"
            }
        ];

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
            fields,
            color: pending.length === 0 ? Colors.Green : Colors.Primary
        } as APIEmbed;
    }
}

type GenerateEmbedOptions = {
    context: Context<CommandMessage>;
    completed: Snowflake[];
    pending: Snowflake[];
    failed: Snowflake[];
    reason?: string;
    total: number;
    errors: string[];
};

export default MassKickCommand;
