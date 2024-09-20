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
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { userFlagsToString } from "@framework/utils/user";
import InfractionManager from "@main/services/InfractionManager";
import { EmbedBuilder, GuildMember, time, User, userMention } from "discord.js";

type UserLookupCommandArgs = {
    user: User | GuildMember;
};

@ArgumentSchema.Definition({
    names: ["user", "user"],
    types: [GuildMemberArgument<true>, UserArgument<true>],
    optional: false,
    errorMessages: [GuildMemberArgument.defaultErrors, UserArgument.defaultErrors]
})
class UserLookupCommand extends Command {
    public override readonly name = "userlookup";
    public override readonly description: string = "Shows information about a user.";
    public override readonly defer = true;
    public override readonly aliases = ["user", "info"];
    public override readonly usage = ["<user: User | GuildMember>"];
    public override readonly systemPermissions = [];
    public override readonly permissions = [PermissionFlags.ManageMessages];

    @Inject()
    private readonly infractionManager!: InfractionManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addUserOption(option =>
                option.setName("user").setDescription("The user to lookup").setRequired(true)
            )
        ];
    }

    public override async execute(context: Context, args: UserLookupCommandArgs): Promise<void> {
        const member = args.user instanceof GuildMember ? args.user : null;
        const user = args.user instanceof User ? args.user : args.user.user;

        const stats = await this.infractionManager.getInfractionStatistics(
            context.guildId,
            user.id
        );

        const flags = userFlagsToString(user.flags!);
        const fields = [
            {
                name: "User",
                value: `ID: ${user.id}\nUsername: ${user.username}\nMention: ${userMention(
                    user.id
                )}\nAccount created at: ${user.createdAt?.toLocaleString()} (${time(
                    user.createdAt ?? new Date(),
                    "R"
                )})`,
                inline: true
            },
            {
                name: "Member",
                value: member
                    ? `Completed Membership Screening: ${member.pending ? "No" : "Yes"}\nNickname: ${
                          member.nickname ?? "*Not set*"
                      }\nJoined At: ${member.joinedAt?.toLocaleString()} (${time(
                          member.joinedAt ?? new Date(),
                          "R"
                      )})` +
                      (member.premiumSince
                          ? `\nBoosting Since: ${member.premiumSince?.toLocaleString()} (${time(
                                member.premiumSince ?? new Date(),
                                "R"
                            )})`
                          : "")
                    : "This user isn't a member of this server",
                inline: true
            },
            {
                name: "Flags",
                value: flags.length === 0 ? "*No flags*" : flags.join("\n")
            },
            {
                name: "Bot?",
                value: user.bot ? "Yes" : "No"
            }
        ];

        if (member?.communicationDisabledUntil) {
            fields.push({
                name: "Timed-out until",
                value: `${member.communicationDisabledUntil.toLocaleDateString()} (${time(
                    member.communicationDisabledUntil,
                    "R"
                )})`
            });
        }

        if (member?.voice && member?.voice.channel) {
            fields.push({
                name: "Current Voice Channel",
                value: `${member?.voice.channel.toString()} (${member?.voice.channel.id})`
            });
        }

        if (member?.roles.highest.id !== member?.guild.id) {
            fields.push({
                name: "Highest Role",
                value: `${member?.roles.highest.toString()} (${member?.roles.highest.id})`
            });
        }

        if (stats) {
            fields.push(
                {
                    name: "Moderation Points",
                    value: `**${stats.total}**`,
                    inline: true
                },
                {
                    name: "Infractions",
                    value: stats.summarize(),
                    inline: true
                },
                {
                    name: "Recommended Action",
                    value: stats.recommendAction(),
                    inline: true
                }
            );
        }

        await context.reply({
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: user.username,
                        iconURL: user.displayAvatarURL()
                    },
                    color: 0x007bff,
                    fields,
                    footer: { text: user.id }
                })
                    .setColor(member?.user!.hexAccentColor ? member.user.hexAccentColor : "#007bff")
                    .setTimestamp()
            ]
        });
    }
}

export default UserLookupCommand;
