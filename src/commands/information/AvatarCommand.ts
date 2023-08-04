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

import { EmbedBuilder, GuildMember, SlashCommandBuilder, User } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";

export default class AvatarCommand extends Command {
    public readonly name = "avatar";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            optional: true,
            typeErrorMessage: "Invalid user given",
            entityNotNull: true,
            entityNotNullErrorMessage: "That user could not be found!"
        }
    ];
    public readonly permissions = [];
    public readonly aliases = ["avt", "av", "pfp"];

    public readonly description = "Shows your or someone else's avatar.";
    public readonly slashCommandBuilder = new SlashCommandBuilder().addUserOption(option =>
        option.setName("user").setDescription("The target user")
    );

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user: User =
            (context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user")) ?? message.member!.user;
        let member: GuildMember | undefined;

        try {
            member = user
                ? message.guild!.members.cache.get(user.id) ?? (await message.guild!.members.fetch(user.id))
                : (message.member! as GuildMember);
        } catch (e) {
            logError(e);
        }

        await this.deferredReply(message, {
            embeds: [
                new EmbedBuilder()
                    .setColor(user!.hexAccentColor ?? "#007bff")
                    .setAuthor({
                        name: member?.user.username ?? user!.username
                    })
                    .setImage(
                        member?.displayAvatarURL({
                            size: 4096,
                            forceStatic: false
                        }) ??
                            user!.displayAvatarURL({
                                size: 4096,
                                forceStatic: false
                            })
                    )
                    .setURL(
                        member?.displayAvatarURL({
                            size: 4096,
                            forceStatic: false
                        }) ??
                            user!.displayAvatarURL({
                                size: 4096,
                                forceStatic: false
                            })
                    )
                    .addFields({
                        name: "Download",
                        value: `[Click Here](${
                            member?.displayAvatarURL({
                                size: 4096,
                                forceStatic: false
                            }) ??
                            user!.displayAvatarURL({
                                size: 4096,
                                forceStatic: false
                            })
                        })`
                    })
                    .setFooter({
                        text: `${user!.username} (${user!.id})`
                    })
            ]
        });
    }
}
