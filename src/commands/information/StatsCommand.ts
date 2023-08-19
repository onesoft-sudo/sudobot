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

import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class StatsCommand extends Command {
    public readonly name = "statistics";
    public readonly validationRules: ValidationRule[] = [];
    public readonly aliases = ["stats"];

    public readonly description = "Show server statistics.";

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const memberCount =
            message.guild!.members.cache.size > message.guild!.memberCount
                ? message.guild!.members.cache.size
                : message.guild!.memberCount;
        let botCount = 0,
            humanCount = 0;

        for (const member of message.guild!.members.cache.values()) {
            if (member.user.bot) botCount++;
            else humanCount++;
        }

        const channelCount = message.guild!.channels.cache.size;
        const roleCount = message.guild!.roles.cache.size;

        return {
            __reply: true,
            embeds: [
                {
                    color: 0x007bff,
                    author: {
                        name: `Statistics of ${message.guild!.name}`,
                        icon_url: message.guild!.iconURL() ?? undefined
                    },
                    fields: [
                        {
                            name: "Total members",
                            value: `${memberCount}`,
                            inline: true
                        },
                        {
                            name: "Human members",
                            value: `${humanCount}`,
                            inline: true
                        },
                        {
                            name: "Bots",
                            value: `${botCount}`,
                            inline: true
                        },
                        {
                            name: "Is Discoverable",
                            value: `${message.guild?.features.includes("DISCOVERABLE") ? "Yes" : "No"}`
                        },
                        {
                            name: "Roles",
                            value: `${roleCount}`,
                            inline: true
                        },
                        {
                            name: "Channels",
                            value: `${channelCount}`,
                            inline: true
                        }
                    ],
                    footer: {
                        text:
                            memberCount >= 60
                                ? "Your server is growing!"
                                : "Put some work and invite more people to grow your community!"
                    }
                }
            ]
        };
    }
}
