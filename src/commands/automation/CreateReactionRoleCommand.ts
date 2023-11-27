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

import { PermissionFlagsBits, SlashCommandBuilder, Snowflake, TextBasedChannel, parseEmoji } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { safeChannelFetch, safeMessageFetch, safeRoleFetch } from "../../utils/fetch";
import { logError } from "../../utils/logger";
import { isSnowflake } from "../../utils/utils";

export default class CreateReactionRoleCommand extends Command {
    public readonly name = "createreactionrole";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "link",
            errors: {
                required: "Please provide a target message link!",
                "type:invalid": "Please provide a __valid__ message link!"
            }
        },
        {
            types: [ArgumentType.String],
            name: "emoji",
            errors: {
                required: "Please provide a trigger emoji!",
                "type:invalid": "Please provide a __valid__ emoji!"
            }
        },
        {
            types: [ArgumentType.StringRest],
            name: "roles",
            errors: {
                required: "Please provide at least one role!",
                "type:invalid": "Please provide __valid__ roles!"
            }
        }
    ];
    public readonly permissions = [PermissionFlagsBits.ManageRoles];
    public readonly aliases = ["createreactrole", "makereactrole", "makerr", "createrr"];
    public readonly description = "Adds a reaction role listener to the given message.";
    public readonly detailedDescription =
        "Adds a reaction listener to the message, and when a user reacts with the given emoji, it will assign the given role(s).";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option => option.setName("message_link").setDescription("The target message link").setRequired(true))
        .addStringOption(option => option.setName("emoji").setDescription("The trigger emoji").setRequired(true))
        .addStringOption(option =>
            option
                .setName("roles")
                .setDescription("The role(s) to assign, when a user reacts with the given emoji")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("mode").setDescription("The behaviour of the reaction role trigger").setChoices(
                {
                    name: "Single and unique role",
                    value: "SINGLE"
                },
                {
                    name: "Multiple (Default)",
                    value: "MULTIPLE"
                }
            )
        );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const link: string = context.isLegacy ? context.parsedNamedArgs.link : context.options.getString("message_link", true);
        const mode = (context.isLegacy ? null : (context.options.getString("mode") as "SINGLE" | "MULTIPLE")) ?? "MULTIPLE";

        if (!/^https?:\/\/(canary\.|ptb\.|beta\.|www\.|)discord\.com\/channels\/\d+\/\d+\/\d+$/i.test(link.trim())) {
            await this.error(message, this.validationRules[0].errors!.required);
            return;
        }

        const [messageId, channelId, guildId] = link
            .substring(0, link[link.length - 1] === "/" ? link.length - 1 : link.length)
            .split("/")
            .reverse();

        if (guildId !== message.guildId!) {
            await this.error(message, "That's a message link from another server!");
            return;
        }

        const rolesUnprocessed: string = (
            context.isLegacy ? context.parsedNamedArgs.roles : context.options.getString("roles", true)
        ).split(/\s+/);

        if (rolesUnprocessed.length > 7) {
            await this.error(message, "Cannot add more than 7 roles to a single emoji trigger!");
            return;
        }

        const roles: Snowflake[] = [];
        const roleNames: string[] = [];

        for (const roleUnprocessed of rolesUnprocessed) {
            const isId = isSnowflake(roleUnprocessed);
            const isMention = roleUnprocessed.startsWith("<@&") && roleUnprocessed.endsWith(">");

            if (!isId && !isMention) {
                await this.deferredReply(message, {
                    content: `${this.emoji("error")} Invalid role: ${roleUnprocessed}`,
                    allowedMentions: {
                        roles: []
                    }
                });

                return;
            }

            const role = await safeRoleFetch(
                message.guild!,
                isId ? roleUnprocessed : roleUnprocessed.substring(3, roleUnprocessed.length - 1)
            );

            if (!role) {
                await this.deferredReply(message, {
                    content: `${this.emoji("error")} Could not find role: ${roleUnprocessed}`,
                    allowedMentions: {
                        roles: []
                    }
                });

                return;
            }

            roles.push(role.id);
            roleNames.push(role.name);
        }

        const emoji: string = context.isLegacy ? context.parsedNamedArgs.emoji : context.options.getString("emoji", true);
        const parsed = parseEmoji(emoji);
        const emojiIdOrName = parsed?.id ?? parsed?.name ?? emoji;

        const channel = await safeChannelFetch(message.guild!, channelId);

        if (!channel) {
            await this.error(message, "Could not find the channel of the message!");
            return;
        }

        const targetMessage = await safeMessageFetch(channel as TextBasedChannel, messageId);

        if (!targetMessage) {
            await this.error(message, "Could not find the target message!");
            return;
        }

        try {
            await targetMessage.react(emoji);
        } catch (e) {
            logError(e);
            await this.error(message, "Invalid emoji given!");
            return;
        }

        await this.client.reactionRoleService.createReactionRole({
            channelId,
            emoji: emojiIdOrName,
            guildId,
            messageId,
            roles,
            mode
        });

        await this.success(
            message,
            `Successfully added reaction role. Reacting with the given emoji will give the user these roles:\n\n\`${roleNames.join(
                "`\n* `"
            )}\``
        );
    }
}
