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

import { formatDistanceStrict, formatDistanceToNowStrict } from "date-fns";
import { EmbedBuilder, GuildMember, PermissionFlagsBits, SlashCommandBuilder, User, userMention } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";
import { flagsToString } from "../../utils/userflags";

export default class UserLookupCommand extends Command {
    public readonly name = "userlookup";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            errors: {
                "type:invalid": "Invalid user mention or ID given",
                "entity:null": "That user could not be found!",
                required: "Please provide a user!"
            },
            entity: {
                notNull: true
            }
        }
    ];
    public readonly permissions = [PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageGuild];
    public readonly permissionMode = "or";

    public readonly description = "Shows information about a user.";
    public readonly slashCommandBuilder = new SlashCommandBuilder().addUserOption(option =>
        option.setName("user").setDescription("The target user").setRequired(true)
    );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user: User = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);
        let member: GuildMember | null = null;

        try {
            member = message.guild!.members.cache.get(user.id) ?? (await message.guild!.members.fetch(user.id));
        } catch (e) {
            logError(e);
        }

        const flags = flagsToString(user.flags!);
        const fields = [
            {
                name: "User",
                value: `ID: ${user.id}\nUsername: ${user.username}\nMention: ${userMention(
                    user.id
                )}\nAccount created at: ${user.createdAt?.toLocaleString()} (${formatDistanceToNowStrict(
                    user.createdAt ?? new Date(),
                    { addSuffix: true }
                )})`,
                inline: true
            },
            {
                name: "Member",
                value: member
                    ? `Completed Membership Screening: ${member.pending ? "No" : "Yes"}\nNickname: ${
                          member.nickname ?? "*Not set*"
                      }\nJoined At: ${member.joinedAt?.toLocaleString()} (${formatDistanceToNowStrict(
                          member.joinedAt ?? new Date(),
                          { addSuffix: true }
                      )})` +
                      (member.premiumSince
                          ? `\nBoosting Since: ${member.premiumSince?.toLocaleString()} (${formatDistanceToNowStrict(
                                member.premiumSince ?? new Date(),
                                { addSuffix: true }
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
                value: `${member.communicationDisabledUntil.toLocaleDateString()} (${formatDistanceStrict(
                    member.communicationDisabledUntil,
                    new Date()
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

        await this.deferredReply(message, {
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
                    .setColor(member?.user!.hexAccentColor ? member?.user!.hexAccentColor! : "#007bff")
                    .setTimestamp()
            ]
        });
    }
}
