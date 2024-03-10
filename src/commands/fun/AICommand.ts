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
import { logError } from "../../utils/Logger";
import Pagination from "../../utils/Pagination";
import { chunkedString } from "../../utils/utils";

type OpenAI = {
    chat: {
        completions: {
            create: (data: {
                messages: Array<{
                    role: "system" | "user";
                    content: string;
                }>;
                model: string;
                user: string;
            }) => Promise<{
                id: string;
                object: string;
                model: string;
                choices: Array<{
                    message: {
                        role: "system" | "user";
                        content: string;
                    };
                    index: number;
                    finish_reason: string;
                }>;
                created: number;
            }>;
        };
    };
};

export default class AICommand extends Command {
    public readonly name = "ai";
    public readonly permissions = [];
    public readonly aliases = ["ask"];
    public readonly supportsLegacy = false;
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option
            .setName("prompt")
            .setDescription("Ask something")
            .setMaxLength(1000)
            .setRequired(true)
    );
    public readonly description = "Ask something to the AI.";
    public openai: OpenAI | null = null;

    async execute(interaction: ChatInputCommandInteraction): Promise<CommandReturn> {
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

                content = data.response;
            } else if (process.env.OPENAI_API_KEY) {
                let openAIAvailable = false;

                try {
                    require.resolve("openai");
                    openAIAvailable = true;
                } catch (error) {
                    this.client.logger.error(error);
                }

                if (!openAIAvailable) {
                    logError("OpenAI package is not installed.");
                    await this.error(
                        interaction,
                        "OpenAI package is not installed. Run `npm install openai` to install it."
                    );
                    return;
                }

                const apiKey = process.env.OPENAI_API_KEY;

                if (openAIAvailable && !this.openai) {
                    this.openai = new (require("openai").OpenAI)({
                        apiKey
                    });
                }

                if (process.env.OPENAI_MODERATION !== "none") {
                    try {
                        const response = await axios.post(
                            "https://api.openai.com/v1/moderations",
                            {
                                input: prompt
                            },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${apiKey}`
                                }
                            }
                        );

                        if (
                            response.data?.results.find((r: Record<string, boolean>) => r.flagged)
                        ) {
                            await this.error(
                                interaction,
                                "Sorry, your prompt was flagged by the OpenAI moderation system."
                            );
                            return;
                        }
                    } catch (error) {
                        logError(error);
                        await this.error(
                            interaction,
                            "An error occurred while trying to moderate the input."
                        );
                        return;
                    }
                }

                const completion = await this.openai!.chat.completions.create({
                    messages: [
                        { role: "system", content: "You're SudoBot, a Discord Moderation Bot." },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    model: process.env.OPENAI_MODEL_ID ?? "gpt-3.5-turbo",
                    user: interaction.user.id
                });

                if (!completion.choices[0]?.message.content) {
                    await interaction.editReply({
                        content: "No response was received from the AI model."
                    });

                    return;
                }

                content = completion.choices[0].message.content;
            } else {
                await interaction.editReply({
                    content: "No suitable AI service provider was configured."
                });

                return;
            }

            const chunks = chunkedString(content);

            if (chunks.length === 1) {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder({
                            title: "Response",
                            color: 0x007bff,
                            description: chunks[0],
                            footer: {
                                text: "Responses will not always be complete or correct"
                            },
                            timestamp: new Date().toISOString()
                        })
                    ]
                });

                return;
            }

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
                content: `${this.emoji(
                    "error"
                )} An error has occurred while trying to communicate with the AI model.`
            });

            return;
        }
    }
}
