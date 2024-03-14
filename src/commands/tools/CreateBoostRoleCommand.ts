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

import {
    ChatInputCommandInteraction,
    ColorResolvable,
    GuildMember,
    SlashCommandBuilder,
    resolveColor
} from "discord.js";
import { logError } from "../../components/log/Logger";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { ChatInputCommandContext } from "../../services/CommandManager";
import { safeRoleFetch } from "../../utils/fetch";

export default class CreateBoostRoleCommand extends Command {
    public readonly name = "createboostrole";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly aliases = ["cbr", "boostrole", "boosterrole", "makeboostrole"];
    public readonly supportsInteractions = true;
    public readonly supportsLegacy = false;

    public readonly description =
        "Creates a custom role and assigns it to you (only for boosters).";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option =>
            option.setName("name").setDescription("The role name, defaults to your name")
        )
        .addStringOption(option =>
            option.setName("color").setDescription("The role color, defaults to transparent")
        );

    async execute(
        message: ChatInputCommandInteraction,
        context: ChatInputCommandContext
    ): Promise<CommandReturn> {
        await this.deferIfInteraction(message);
        const createAfterRoleId = context.config.create_boost_role?.create_roles_after;

        if (!createAfterRoleId) {
            await this.error(
                message,
                "This server does not have *automatic custom roles for boosters* enabled."
            );
            return;
        }

        const member = message.member! as GuildMember;

        if (!member.premiumSince && !member?.permissions.has("Administrator")) {
            await this.error(message, "You are not a booster!");
            return;
        }

        let colorCode = context.options.getString("color");
        let colorCodeHex: number | null = null;
        const name: string =
            context.options.getString("name") ?? member!.displayName ?? message.user.username;

        if (colorCode && colorCode.startsWith("0x")) {
            colorCode = colorCode.replace(/^0x/i, "#");
        } else if (colorCode && !colorCode.startsWith("#")) {
            colorCode = `#${colorCode}`;
        }

        if (typeof colorCode === "string") {
            try {
                colorCodeHex = resolveColor(colorCode as ColorResolvable);
            } catch (e) {
                logError(e);
                await this.error(message, "Invalid color code specified");
                return;
            }
        }

        const createAfterRole =
            (await safeRoleFetch(message.guild!, createAfterRoleId)) ??
            message.guild!.roles.everyone;

        const boostRoleEntry = await this.client.prisma.boostRoleEntries.findFirst({
            where: {
                guild_id: message.guildId!,
                user_id: message.member!.user.id
            }
        });

        if (boostRoleEntry && member?.roles?.cache.has(boostRoleEntry.role_id)) {
            await this.error(message, "You already have a custom role!");
            return;
        } else if (boostRoleEntry) {
            await this.client.prisma.boostRoleEntries.delete({
                where: {
                    id: boostRoleEntry.id
                }
            });
        }

        try {
            const role = await message.guild!.roles.create({
                color: colorCodeHex ?? undefined,
                hoist: false,
                mentionable: false,
                permissions: [],
                position: createAfterRole.position + 1,
                name,
                reason: "Creating custom role for admin/booster"
            });

            await member.roles?.add(role, "Adding the new role to the member");

            await this.client.prisma.boostRoleEntries
                .create({
                    data: {
                        guild_id: message.guildId!,
                        user_id: message.member!.user.id,
                        role_id: role.id
                    }
                })
                .catch(logError);

            await this.deferredReply(message, {
                content: `${this.emoji("check")} Assigned the role ${role.toString()} to you.`,
                allowedMentions: {
                    roles: []
                }
            });
        } catch (e) {
            logError(e);
            await this.error(
                message,
                "An error has occurred while creating the role. Make sure that I have enough permissions."
            );
            return;
        }
    }
}
