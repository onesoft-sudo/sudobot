/**
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

import { Infraction, InfractionType } from "@prisma/client";
import {
    ActionRowBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    User,
    time
} from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";

export default class ModStatsCommand extends Command {
    public readonly name = "modstats";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            entity: {
                notNull: true
            },
            optional: true,
            errors: {
                "entity:null": "No such user found. Please mention a valid user.",
                "type:invalid": "Please mention a valid user."
            },
            name: "user"
        }
    ];
    public readonly permissions = [
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageMessages
    ];
    public readonly permissionMode = "or";
    public readonly aliases = ["modstat", "moderatorstats", "moderatorstat"];
    public readonly slashCommandBuilder = new SlashCommandBuilder().addUserOption(option =>
        option.setName("user").setDescription("The moderator user to view the stats of. Defaults to the command executor.")
    );
    public readonly description = "View the statistics of a moderator.";
    public readonly since = "8.1.0";
    public readonly argumentSyntaxes = ["[user]"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);
        const user =
            (context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user")) ?? (message.member!.user as User);
        const infractionCount = await this.client.prisma.infraction.count({
            where: {
                moderatorId: user.id,
                guildId: message.guildId!
            }
        });

        if (infractionCount === 0) {
            await this.error(message, "This moderator has not given any infractions in this server.");
            return;
        }

        const pagination = new Pagination(null, {
            channelId: message.channelId!,
            guildId: message.guildId!,
            limit: 4,
            userId: message.member!.user.id,
            client: this.client,
            timeout: 180_000,
            removeComponentsOnDisable: true,
            metadata: {
                sort: "desc",
                filter: "all"
            },
            extraActionRows() {
                const sortMode: string = (pagination as Pagination<Infraction>).getMetadata("sort");
                const filterMode: string = (pagination as Pagination<Infraction>).getMetadata("filter");

                return [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("infraction_sort")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .addOptions(
                                {
                                    label: "Sort by date (Ascending)",
                                    value: "asc",
                                    description: "Sort the infractions by their date",
                                    emoji: "📅",
                                    default: sortMode === "asc"
                                },
                                {
                                    label: "Sort by date (Descending)",
                                    value: "desc",
                                    description: "Sort the infractions by their date, in descending order",
                                    emoji: "📅",
                                    default: sortMode === "desc"
                                }
                            )
                    ),
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("infraction_filter")
                            .setMinValues(1)
                            .setMaxValues(1)
                            .addOptions(
                                {
                                    label: "Show all",
                                    value: "all",
                                    description: "Show all infractions",
                                    emoji: "🔢",
                                    default: filterMode === "all"
                                },
                                {
                                    label: "Show from the last 24 hours",
                                    value: "day",
                                    description: "Show all infractions from the last 24 hours",
                                    emoji: "🔢",
                                    default: filterMode === "day"
                                },
                                {
                                    label: "Show from the last week",
                                    value: "week",
                                    description: "Show all infractions from the last 7 days",
                                    emoji: "🔢",
                                    default: filterMode === "week"
                                },
                                {
                                    label: "Show from the last month",
                                    value: "month",
                                    description: "Show all infractions from the last 30 days",
                                    emoji: "🔢",
                                    default: filterMode === "month"
                                },
                                {
                                    label: "Show from the last year",
                                    value: "year",
                                    description: "Show all infractions from the last year",
                                    emoji: "🔢",
                                    default: filterMode === "year"
                                }
                            )
                    )
                ];
            },
            async onInteraction(interaction) {
                if (!interaction.isStringSelectMenu()) {
                    return;
                }

                const { customId, values } = interaction;

                if (customId === "infraction_sort") {
                    await pagination.update(interaction, { sort: values[0] as "asc" | "desc" });
                } else if (customId === "infraction_filter") {
                    pagination.update(interaction, { filter: values[0] as "all" | "day" | "week" | "month" | "year" });
                }
            },
            fetchData(options): Promise<Infraction[]> {
                const { limit, offset } = options;
                const filter: string = (pagination as Pagination<Infraction>).getMetadata("filter");

                return this.client.prisma.infraction.findMany({
                    where: {
                        moderatorId: user.id,
                        guildId: message.guildId!,
                        createdAt: {
                            gte:
                                filter === "all"
                                    ? new Date(0)
                                    : new Date(
                                          Date.now() -
                                              (filter === "day"
                                                  ? 86400000
                                                  : filter === "week"
                                                  ? 604800000
                                                  : filter === "month"
                                                  ? 2592000000
                                                  : 31536000000)
                                      )
                        }
                    },
                    skip: offset,
                    take: limit,
                    orderBy: {
                        createdAt: pagination.getMetadata<"asc" | "desc">("sort")
                    }
                });
            },
            maxData: (): Promise<number> => {
                const filter: string = (pagination as Pagination<Infraction>).getMetadata("filter");

                return this.client.prisma.infraction.count({
                    where: {
                        moderatorId: user.id,
                        guildId: message.guildId!,
                        createdAt: {
                            gte:
                                filter === "all"
                                    ? new Date(0)
                                    : new Date(
                                          Date.now() -
                                              (filter === "day"
                                                  ? 86400000
                                                  : filter === "week"
                                                  ? 604800000
                                                  : filter === "month"
                                                  ? 2592000000
                                                  : 31536000000)
                                      )
                        }
                    },
                    orderBy: {
                        createdAt: pagination.getMetadata("sort")
                    }
                });
            },
            embedBuilder({ data, currentPage, maxPages }): EmbedBuilder {
                let description = "";

                for (const infraction of data) {
                    description += `### Infraction #${infraction.id}\n`;
                    description += `**Type**: ${
                        infraction.type === InfractionType.BULK_DELETE_MESSAGE
                            ? "Bulk message delete"
                            : infraction.type[0] + infraction.type.substring(1).toLowerCase().replace(/_/g, " ")
                    }\n`;
                    description += `**Moderator**: <@${infraction.moderatorId}> (${infraction.moderatorId})\n`;
                    description += `**Reason**:\n${
                        infraction.reason ? `\`\`\`\n${infraction.reason}\n\`\`\`` : "*No reason provided*"
                    }\n`;
                    description += `**Created At**: ${time(infraction.createdAt, "D")} (${time(infraction.createdAt, "R")})\n`;
                    description += `**Updated At**: ${time(infraction.updatedAt, "D")} (${time(infraction.updatedAt, "R")})\n`;
                    description += `\n`;
                }

                return new EmbedBuilder({
                    author: {
                        name: `Infractions given by ${user.username}`,
                        icon_url: user.displayAvatarURL()
                    },
                    description,
                    footer: {
                        text: `Page ${currentPage} of ${maxPages} • ${(
                            pagination as Pagination<Infraction>
                        ).getEntryCount()} infractions total`
                    },
                    color: 0x007bff
                }).setTimestamp();
            }
        });

        const options = await pagination.getMessageOptions();
        const reply = await this.deferredReply(message, options);
        await pagination.start(reply);
    }
}
