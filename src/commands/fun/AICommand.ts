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
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import Command, { CommandReturn } from "../../core/Command";
import { ChatInputCommandContext } from "../../services/CommandManager";
import { logError } from "../../utils/logger";

type AIMessage = {
    role: "system" | "user";
    content: string;
};

export default class AICommand extends Command {
    public readonly name = "ai";
    public readonly permissions = [];
    public readonly aliases = ["ask"];
    public readonly supportsLegacy = false;
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("prompt").setDescription("Ask something").setMaxLength(1000).setRequired(true)
    );
    public readonly description = "Ask something to the AI, powered by LLAMA2 LLM.";

    async execute(interaction: ChatInputCommandInteraction, context: ChatInputCommandContext): Promise<CommandReturn> {
        await interaction.deferReply();

        const prompt = interaction.options.getString("prompt", true);

        try {
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

            await interaction.editReply({
                embeds: [
                    {
                        title: "Response",
                        color: 0x007bff,
                        description: data.response,
                        footer: {
                            text: "Responses will not always be complete or correct"
                        },
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        } catch (error) {
            logError(error);

            await interaction.editReply({
                content: `${this.emoji("error")} An error has occurred while trying to communicate with the AI model.`
            });

            return;
        }
    }
}
