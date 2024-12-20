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
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument";
import UserArgument from "@framework/arguments/UserArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import InteractionContext from "@framework/commands/InteractionContext";
import LegacyContext from "@framework/commands/LegacyContext";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    User
} from "discord.js";

type AvatarCommandArgs = {
    user: GuildMember | User;
};

@ArgumentSchema.Definition({
    names: ["user", "user"],
    types: [GuildMemberArgument<true>, UserArgument<true>],
    optional: true,
    errorMessages: [GuildMemberArgument.defaultErrors, UserArgument.defaultErrors]
})
class AvatarCommand extends Command {
    public override readonly name = "avatar";
    public override readonly description: string = "Shows your or someone else's avatar.";
    public override readonly defer = true;
    public override readonly usage = ["[user: User]"];
    public override readonly systemPermissions = [];
    public override readonly aliases = ["avt", "av", "pfp", "gav", "gavatar", "gavt", "gpfp"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addUserOption(option =>
                option.setName("user").setDescription("The user to lookup").setRequired(true)
            )
        ];
    }

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>,
        args: AvatarCommandArgs
    ): Promise<void> {
        const user = args.user
            ? args.user instanceof GuildMember
                ? args.user.user
                : args.user
            : context.user;
        let member: GuildMember | undefined;

        if (
            !(context.isLegacy()
                ? context.argv[0].startsWith("g")
                : (context.options.getBoolean("global") ?? false))
        ) {
            try {
                member = user
                    ? (context.guild.members.cache.get(user.id) ??
                      (await context.guild.members.fetch(user.id)))
                    : context.member!;
            } catch {
                return void (await context.error("Failed to fetch member."));
            }
        }

        await context.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(user.accentColor ?? "#007bff")
                    .setAuthor({
                        name: member?.user.username ?? user.username
                    })
                    .setImage(
                        member?.displayAvatarURL({
                            size: 4096,
                            forceStatic: false
                        }) ??
                            user.displayAvatarURL({
                                size: 4096,
                                forceStatic: false
                            })
                    )
                    .setURL(
                        member?.displayAvatarURL({
                            size: 4096,
                            forceStatic: false
                        }) ??
                            user.displayAvatarURL({
                                size: 4096,
                                forceStatic: false
                            })
                    )
                    .setFooter({
                        text: `${user.username} (${user.id})`
                    })
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel("Download")
                        .setURL(
                            member?.displayAvatarURL({
                                size: 4096,
                                forceStatic: false
                            }) ??
                                user.displayAvatarURL({
                                    size: 4096,
                                    forceStatic: false
                                })
                        )
                )
            ]
        });
    }
}

export default AvatarCommand;
