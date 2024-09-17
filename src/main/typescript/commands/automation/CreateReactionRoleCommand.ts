/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import StringArgument from "@framework/arguments/StringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import InteractionContext from "@framework/commands/InteractionContext";
import LegacyContext from "@framework/commands/LegacyContext";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { fetchChannel, fetchMessage, fetchRole } from "@framework/utils/entities";
import { isSnowflake } from "@framework/utils/utils";
import ReactionRoleService from "@main/services/ReactionRoleService";
import {
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    Snowflake,
    parseEmoji
} from "discord.js";

type CreateReactionRoleCommandArgs = {
    link: string;
    emoji: string;
    roles: string;
};

@ArgumentSchema.Overload([
    {
        names: ["link"],
        types: [StringArgument],
        optional: false,
        errorMessages: [
            {
                [ErrorType.Required]: "You must provide a message link."
            }
        ]
    },
    {
        names: ["emoji"],
        types: [StringArgument],
        optional: false,
        errorMessages: [
            {
                [ErrorType.Required]: "You must provide an emoji."
            }
        ]
    },
    {
        names: ["roles"],
        types: [RestStringArgument],
        optional: false,
        errorMessages: [
            {
                [ErrorType.Required]: "You must provide at least one role."
            }
        ]
    }
])
class CreateReactionRoleCommand extends Command {
    public override readonly name = "createreactionrole";
    public override readonly description: string = "Create a reaction role trigger.";
    public override readonly detailedDescription: string =
        "Create a reaction role trigger. When a user reacts with the given emoji, they will be given the specified role(s).";
    public override readonly defer = true;
    public override readonly aliases = ["crr", "rr"];
    public override readonly usage = ["<link: URL> <emoji: string> <...roles: Role[]>"];
    public override readonly permissions = [PermissionFlags.ManageRoles];
    public override readonly systemPermissions = [PermissionFlagsBits.ManageRoles];

    @Inject()
    private readonly reactionRoleService!: ReactionRoleService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("link")
                        .setDescription("The target message link")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("emoji").setDescription("The trigger emoji").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("roles")
                        .setDescription(
                            "The role(s) to assign, when a user reacts with the given emoji"
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("mode")
                        .setDescription("The behavior of the reaction role trigger")
                        .setChoices(
                            {
                                name: "Single and unique role",
                                value: "SINGLE"
                            },
                            {
                                name: "Multiple (Default)",
                                value: "MULTIPLE"
                            }
                        )
                )
        ];
    }

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>,
        args: CreateReactionRoleCommandArgs
    ): Promise<void> {
        if (!context.config?.reaction_roles?.enabled) {
            await context.error("Reaction roles are disabled in this server.");
            return;
        }

        const { link, emoji } = args;
        const mode =
            (context.isLegacy()
                ? null
                : (context.options.getString("mode") as "SINGLE" | "MULTIPLE")) ?? "MULTIPLE";

        if (
            !/^https?:\/\/(canary\.|ptb\.|beta\.|www\.|)discord\.com\/channels\/\d+\/\d+\/\d+$/i.test(
                link.trim()
            )
        ) {
            await context.error(
                "Invalid message link provided. Please provide a valid message link."
            );
            return;
        }

        const [messageId, channelId, guildId] = link
            .substring(0, link[link.length - 1] === "/" ? link.length - 1 : link.length)
            .split("/")
            .reverse();

        if (guildId !== context.guildId) {
            await context.error("That's a message link from another server!");
            return;
        }

        const rolesUnprocessed: string[] = args.roles.split(/\s+/);

        if (rolesUnprocessed.length > 7) {
            await context.error("Cannot add more than 7 roles to a single emoji trigger!");
            return;
        }

        const roles: Snowflake[] = [];
        const roleNames: string[] = [];

        for (const roleUnprocessed of rolesUnprocessed) {
            const isId = isSnowflake(roleUnprocessed);
            const isMention = roleUnprocessed.startsWith("<@&") && roleUnprocessed.endsWith(">");

            if (!isId && !isMention) {
                await context.reply({
                    content:
                        `${context.emoji("error")} Invalid role: ${roleUnprocessed}`.trimStart(),
                    allowedMentions: {
                        roles: []
                    }
                });

                return;
            }

            const role = await fetchRole(
                context.guild,
                isId ? roleUnprocessed : roleUnprocessed.substring(3, roleUnprocessed.length - 1)
            );

            if (!role) {
                await context.reply({
                    content:
                        `${context.emoji("error")} Could not find role: ${roleUnprocessed}`.trimStart(),
                    allowedMentions: {
                        roles: []
                    }
                });

                return;
            }

            roles.push(role.id);
            roleNames.push(role.name);
        }

        const parsed = parseEmoji(emoji);
        const emojiIdOrName = parsed?.id ?? parsed?.name ?? emoji;

        const channel = await fetchChannel(context.guild, channelId);

        if (!channel?.isTextBased()) {
            await context.error("Could not find the text channel of the message!");
            return;
        }

        const targetMessage = await fetchMessage(channel, messageId);

        if (!targetMessage) {
            await context.error("Could not find the target message!");
            return;
        }

        try {
            await targetMessage.react(emoji);
        } catch (e) {
            this.application.logger.error(e);
            await context.error("Invalid emoji given!");
            return;
        }

        await this.reactionRoleService.createReactionRole({
            channelId,
            emoji: emojiIdOrName,
            guildId,
            messageId,
            roles,
            mode
        });

        await context.success(
            `Successfully added reaction role. Reacting with the given emoji will give the user these roles:\n\n\`${roleNames.join(
                "`\n* `"
            )}\``
        );
    }
}

export default CreateReactionRoleCommand;
