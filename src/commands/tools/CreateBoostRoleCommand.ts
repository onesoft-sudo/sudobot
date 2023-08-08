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

import { ColorResolvable, Message, resolveColor } from "discord.js";
import Command, { ArgumentType, CommandReturn, ValidationRule } from "../../core/Command";
import { LegacyCommandContext } from "../../services/CommandManager";
import { safeRoleFetch } from "../../utils/fetch";
import { logError } from "../../utils/logger";

export default class CreateBoostRoleCommand extends Command {
    public readonly name = "createboostrole";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            optional: true,
            typeErrorMessage: "Please specify a valid color code!",
            name: "colorCode"
        }
    ];
    public readonly permissions = [];
    public readonly aliases = ["cbr", "boostrole", "boosterrole", "makeboostrole"];
    public readonly supportsInteractions = false;

    public readonly description = "Creates a custom role from boosters.";

    async execute(message: Message, context: LegacyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);
        const createAfterRoleId = context.config.create_boost_role?.create_roles_after;

        if (!createAfterRoleId) {
            await this.error(message, "This server does not have *automatic custom roles for boosters* enabled.");
            return;
        }

        if (!message.member?.premiumSince && !message.member?.permissions.has("Administrator")) {
            await this.error(message, "You are not a booster!");
            return;
        }

        let colorCode = context.parsedNamedArgs.colorCode;

        if (colorCode && colorCode.startsWith("0x")) {
            colorCode = colorCode.replace(/^0x/i, "#");
        } else if (colorCode && !colorCode.startsWith("#")) {
            colorCode = `#${colorCode}`;
        }

        if (typeof colorCode === "string") {
            try {
                colorCode = resolveColor(colorCode as ColorResolvable);
            } catch (e) {
                logError(e);
                await this.error(message, "Invalid color code specified");
                return;
            }
        }

        const createAfterRole = (await safeRoleFetch(message.guild!, createAfterRoleId)) ?? message.guild!.roles.everyone;

        const boostRoleEntry = await this.client.prisma.boostRoleEntries.findFirst({
            where: {
                guild_id: message.guildId!,
                user_id: message.member!.user.id
            }
        });

        if (boostRoleEntry && message.member.roles.cache.has(boostRoleEntry.role_id)) {
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
                color: colorCode ?? undefined,
                hoist: false,
                mentionable: false,
                permissions: [],
                position: createAfterRole.position + 1,
                name: message.member!.displayName,
                reason: "Creating custom role for admin/booster"
            });

            await message.member!.roles.add(role, "Adding the new role to the member");

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
            await this.error(message, "An error has occurred while creating the role. Make sure that I have enough permissions.");
            return;
        }
    }
}
