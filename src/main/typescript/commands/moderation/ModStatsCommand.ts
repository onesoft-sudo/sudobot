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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import UserArgument from "@framework/arguments/UserArgument";
import { type Buildable, Command } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import Pagination from "@framework/widgets/Pagination";
import { Colors } from "@main/constants/Colors";
import { Infraction, infractions } from "@main/models/Infraction";
import InfractionManager from "@main/services/InfractionManager";
import { ActionRowBuilder, StringSelectMenuBuilder, User, italic, time } from "discord.js";
import { and, asc, count, desc, eq, gte } from "drizzle-orm";

type ModStatsCommandArgs = {
    user?: User;
};

@ArgumentSchema.Definition({
    names: ["user"],
    types: [UserArgument<true>],
    optional: true,
    errorMessages: [UserArgument.defaultErrors],
    interactionName: "user",
    interactionType: UserArgument<true>
})
export default class ModStatsCommand extends Command {
    public override readonly name = "modstats";
    public override readonly description = "View the statistics of a moderator.";
    public override readonly aliases = ["modstat", "moderatorstats", "moderatorstat"];
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly defer = true;

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option.setName("user").setDescription("The target user.")
                )
        ];
    }

    public override async execute(context: Context, args: ModStatsCommandArgs): Promise<void> {
        const user = args.user ?? context.user;

        const state: {
            sortMode: "asc" | "desc";
            filterMode: "all" | "day" | "week" | "month" | "year";
            count: number;
            createdAtFilters?: {
                gte?: Date;
            };
        } = {
            sortMode: "desc",
            filterMode: "all",
            count:
                (
                    await this.application.database.drizzle
                        .select({ count: count() })
                        .from(infractions)
                        .where(
                            and(
                                eq(infractions.moderatorId, user.id),
                                eq(infractions.guildId, context.guildId)
                            )
                        )
                ).at(0)?.count ?? 0
        };

        if (state.count === 0) {
            await context.error(
                `${context.user.id === user.id ? "You have" : "This moderator has"} not given any infractions in this server.`
            );
            return;
        }

        const pagination: Pagination<Infraction> = Pagination.withFetcher(
            async ({ limit, page }) => {
                const { sortMode, createdAtFilters } = state;
                const data = await this.application.database.query.infractions.findMany({
                    where: and(
                        eq(infractions.moderatorId, user.id),
                        eq(infractions.guildId, context.guildId),
                        createdAtFilters?.gte
                            ? gte(infractions.createdAt, createdAtFilters.gte)
                            : undefined
                    ),
                    orderBy:
                        sortMode === "asc"
                            ? asc(infractions.createdAt)
                            : desc(infractions.createdAt),
                    limit,
                    offset: (page - 1) * limit
                });

                return { data };
            }
        )
            .setMessageOptionsBuilder(({ data, maxPages, page }) => {
                let description = "";

                for (const infraction of data) {
                    description += `### Infraction #${infraction.id}\n`;
                    description += `**Type:** ${this.infractionManager.prettifyInfractionType(infraction.type)}\n`;
                    description += `**User:** ${infraction.userId ? (infraction.userId === "0" ? "[Unknown]" : `<@${infraction.userId}> (${infraction.userId})`) : italic("Unknown")}\n`;
                    description += `**Reason:**\n${infraction.reason ? infraction.reason.slice(0, 150) + (infraction.reason.length > 150 ? "\n..." : "") : italic("No reason provided")}\n`;
                    description += `**Created at:** ${time(infraction.createdAt)}\n\n`;
                }

                return {
                    embeds: [
                        {
                            author: {
                                name: `Infractions given by ${user.username}`,
                                icon_url: user.displayAvatarURL()
                            },
                            color: Colors.Primary,
                            description: description === "" ? "No infractions found." : description,
                            footer: {
                                text: `Page ${page} of ${maxPages} • ${state.count} infractions total`
                            }
                        }
                    ]
                };
            })
            .setActionRowBuilder(row => [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`${pagination.customId}_infraction_sort`)
                        .setMinValues(1)
                        .setMaxValues(1)
                        .addOptions(
                            {
                                label: "Sort by date (Ascending)",
                                value: "asc",
                                description: "Sort the infractions by their date",
                                emoji: "📅",
                                default: state.sortMode === "asc"
                            },
                            {
                                label: "Sort by date (Descending)",
                                value: "desc",
                                description:
                                    "Sort the infractions by their date, in descending order",
                                emoji: "📅",
                                default: state.sortMode === "desc"
                            }
                        )
                ),
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`${pagination.customId}_infraction_filter`)
                        .setMinValues(1)
                        .setMaxValues(1)
                        .addOptions(
                            {
                                label: "Show all",
                                value: "all",
                                description: "Show all infractions",
                                emoji: "🔢",
                                default: state.filterMode === "all"
                            },
                            {
                                label: "Show from the last 24 hours",
                                value: "day",
                                description: "Show all infractions from the last 24 hours",
                                emoji: "🔢",
                                default: state.filterMode === "day"
                            },
                            {
                                label: "Show from the last week",
                                value: "week",
                                description: "Show all infractions from the last 7 days",
                                emoji: "🔢",
                                default: state.filterMode === "week"
                            },
                            {
                                label: "Show from the last month",
                                value: "month",
                                description: "Show all infractions from the last 30 days",
                                emoji: "🔢",
                                default: state.filterMode === "month"
                            },
                            {
                                label: "Show from the last year",
                                value: "year",
                                description: "Show all infractions from the last year",
                                emoji: "🔢",
                                default: state.filterMode === "year"
                            }
                        )
                ),
                row
            ])
            .setInteractionCreateListener(async interaction => {
                if (interaction.isStringSelectMenu()) {
                    if (interaction.customId.endsWith("infraction_sort")) {
                        state.sortMode = interaction.values[0] as "asc" | "desc";
                    } else if (interaction.customId.endsWith("infraction_filter")) {
                        const filterMode = interaction.values[0] as
                            | "all"
                            | "day"
                            | "week"
                            | "month"
                            | "year";

                        if (filterMode !== state.filterMode) {
                            state.filterMode = filterMode;
                            state.createdAtFilters =
                                filterMode === "all"
                                    ? undefined
                                    : {
                                          gte: new Date(
                                              Date.now() -
                                                  (filterMode === "day"
                                                      ? 86400000
                                                      : filterMode === "week"
                                                        ? 604800000
                                                        : filterMode === "month"
                                                          ? 2592000000
                                                          : filterMode === "year"
                                                            ? 31536000000
                                                            : 0)
                                          )
                                      };

                            state.count =
                                (
                                    await this.application.database.drizzle
                                        .select({ count: count() })
                                        .from(infractions)
                                        .where(
                                            and(
                                                eq(infractions.moderatorId, user.id),
                                                eq(infractions.guildId, context.guildId),
                                                state.createdAtFilters?.gte
                                                    ? gte(
                                                          infractions.createdAt,
                                                          state.createdAtFilters.gte
                                                      )
                                                    : undefined
                                            )
                                        )
                                ).at(0)?.count ?? 0;
                            state.filterMode = filterMode;
                        }
                    }

                    await pagination.update(interaction);
                }
            })
            .setLimit(10)
            .setCountGetter(() => state.count)
            .setMaxTimeout(180_000);

        await context.reply(await pagination.getMessageOptions());
    }
}
