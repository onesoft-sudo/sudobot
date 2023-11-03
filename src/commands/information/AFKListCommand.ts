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

import { formatDistanceToNowStrict } from "date-fns";
import { EmbedBuilder, PermissionsBitField } from "discord.js";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { isSystemAdmin } from "../../utils/utils";

export default class AFKListCommand extends Command {
    public readonly name = "afklist";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers];
    public readonly description = "Lists all the users who are currently AFK, in this guild.";
    public readonly availableOptions = {
        "-g, --global": "Lists all the users who are AFK, in all servers [System Admin Only]"
    };

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const global = context.isLegacy && (context.args.includes("-g") || context.args.includes("--global"));

        if (global && !isSystemAdmin(this.client, message.member!.user.id)) {
            await this.error(message, "You don't have permission to use the global flag.");
            return;
        }

        const entries = this.client.afkService
            .getEntries()
            .filter(entry => global || entry.global || entry.guildId === message.guildId);
        let description = "";

        for (const [, entry] of entries) {
            description += "* ";

            if (global) {
                const guild = this.client.guilds.cache.get(entry.guildId);
                description += guild ? `**${guild.name}** - ` : "";
            }

            description += `<@${entry.userId}> [${entry.userId}] - AFK for **${formatDistanceToNowStrict(entry.createdAt)}**\n`;
        }

        description = description === "" ? "*No data available.*" : description;

        await message.reply({
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: global ? "Global AFK List" : `AFK Users in ${message.guild!.name}`,
                        iconURL: global ? undefined : message.guild?.iconURL() ?? undefined
                    },
                    description,
                    footer: {
                        text: `${entries.size} entries total`
                    }
                }).setTimestamp()
            ],
            ephemeral: global
        });
    }
}
