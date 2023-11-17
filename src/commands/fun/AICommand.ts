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

import axios from "axios";
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Command, { CommandReturn } from "../../core/Command";
import { ChatInputCommandContext } from "../../services/CommandManager";
import Pagination from "../../utils/Pagination";
import { logError } from "../../utils/logger";
import { chunkedString } from "../../utils/utils";

export default class AICommand extends Command {
    public readonly name = "ai";
    public readonly permissions = [];
    public readonly aliases = ["ask"];
    public readonly supportsLegacy = false;
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("prompt").setDescription("Ask something").setMaxLength(1000).setRequired(true)
    );
    public readonly description = "Ask something to the AI.";

    async execute(interaction: ChatInputCommandInteraction, context: ChatInputCommandContext): Promise<CommandReturn> {
        await interaction.deferReply();

        const prompt = interaction.options.getString("prompt", true);
        let content = "";

        try {
            if (process.env.GOOGLE_MAKERSUIT_KEY) {
                const url = `https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage?key=${encodeURIComponent(
                    process.env.GOOGLE_MAKERSUIT_KEY
                )}`;

                const response = await axios.post(url, {
                    prompt: {
                        messages: [
                            {
                                content: prompt
                            }
                        ],
                        context: "You're SudoBot, a Discord Moderation Bot.",
                        examples: undefined
                    },
                    temperature: undefined,
                    candidate_count: 1,
                    topK: undefined,
                    topP: undefined
                });

                if (response.data.filters?.[0]?.reason) {
                    const reason =
                        {
                            BLOCKED_REASON_UNSPECIFIED: "for an unspecified reason",
                            SAFETY: "by the safety filter"
                        }[response.data.filters?.[0]?.reason as string] ?? "for unknown reasons";

                    await interaction.editReply({
                        content: `This request was cancelled ${reason}.`
                    });

                    return;
                }

                console.log(JSON.stringify(response.data, null, 2));

                content = response.data.candidates?.[0]?.content;
            } else if (process.env.CF_AI_URL) {
                const { data } = await axios.post(
                    process.env.CF_AI_URL!,
                    {
                        messages: [
                            {
                                role: "system",
                                content:
                                    "You are a Discord Moderation bot. Your name is SudoBot. You were built at OSN, by open source developers."
                            },
                            { role: "user", content: prompt }
                        ]
                    },
                    {
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );

                console.log(data);
                content = data.response;
            } else {
                await interaction.editReply({
                    content: "No suitable AI service provider was configured."
                });

                return;
            }

            const chunks = chunkedString(content);
            const pagination = new Pagination(chunks, {
                limit: 1,
                channelId: interaction.channelId!,
                guildId: interaction.guildId!,
                client: this.client,
                embedBuilder({ currentPage, data: [chunk], maxPages }) {
                    return new EmbedBuilder({
                        title: "Response",
                        color: 0x007bff,
                        description: chunk,
                        footer: {
                            text: `Page ${currentPage} of ${maxPages} • Responses will not always be complete or correct`
                        },
                        timestamp: new Date().toISOString()
                    });
                },
                timeout: 60_000 * 5
            });

            const message = await interaction.editReply(await pagination.getMessageOptions(1));
            await pagination.start(message!);
        } catch (error) {
            logError(error);

            await interaction.editReply({
                content: `${this.emoji("error")} An error has occurred while trying to communicate with the AI model.`
            });

            return;
        }
    }
}
