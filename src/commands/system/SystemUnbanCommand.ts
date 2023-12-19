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

import { Message, User } from "discord.js";
import Command, { ArgumentType, CommandReturn, ValidationRule } from "../../core/Command";
import { LegacyCommandContext } from "../../services/CommandManager";
import { userInfo } from "../../utils/embed";

export default class SystemUnbanCommand extends Command {
    public readonly name = "systemunban";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            entity: {
                notNull: true
            },
            errors: {
                "entity:null": "Please provide a valid user!",
                required: "Please provide a user to unban!"
            }
        }
    ];
    public readonly aliases = ["sysunban"];
    public readonly systemAdminOnly = true;
    public readonly supportsInteractions = false;
    public readonly description = "Unban a user from using the bot.";
    public readonly argumentSyntaxes = ["<User|UserId|UserMention>"];

    async execute(message: Message, context: LegacyCommandContext): Promise<CommandReturn> {
        const { user } = context.parsedNamedArgs as {
            user: User;
        };

        if (!this.client.commandManager.isBanned(user.id)) {
            await this.error(message, "This user is not banned!");
            return;
        }

        await this.client.commandManager.removeBan(user.id);

        await message.reply({
            embeds: [
                {
                    author: {
                        icon_url: user.displayAvatarURL(),
                        name: user.username
                    },
                    color: 0x007bff,
                    description: `**${user.username}** has been unbanned from the system globally.`,
                    fields: [
                        {
                            name: "User",
                            value: userInfo(user),
                            inline: true
                        },
                        {
                            name: "Responsible System Admin",
                            value: userInfo(message.author),
                            inline: true
                        }
                    ]
                }
            ]
        });
    }
}
