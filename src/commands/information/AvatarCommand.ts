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
import { logError } from "../../components/io/Logger";
import Command, {
    ArgumentType,
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";

export default class AvatarCommand extends Command {
    public readonly name = "avatar";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            optional: true,
            errors: {
                "type:invalid": "Invalid user given",
                "entity:null": "That user could not be found!"
            },
            entity: {
                notNull: true
            }
        }
    ];
    public readonly permissions = [];
    public readonly aliases = ["avt", "av", "pfp", "gav", "gavatar", "gavt", "gpfp"];

    public readonly description = "Shows your or someone else's avatar.";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("user").setDescription("The target user"))
        .addBooleanOption(option =>
            option
                .setName("global")
                .setDescription(
                    "Specify whether the system should fetch the global user avatar instead of guild-only avatar"
                )
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user: User =
            (context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user")) ??
            message.member!.user;
        let member: GuildMember | undefined;

        if (
            !(context.isLegacy
                ? context.argv[0].startsWith("g")
                : context.options.getBoolean("global") ?? false)
        ) {
            try {
                member = user
                    ? message.guild!.members.cache.get(user.id) ??
                      (await message.guild!.members.fetch(user.id))
                    : (message.member! as GuildMember);
            } catch (e) {
                logError(e);
            }
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
