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

import { GuildMember, PermissionsBitField, Role, SlashCommandBuilder, time } from "discord.js";
import path from "path";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import QueueEntry from "../../utils/QueueEntry";
import { stringToTimeInterval } from "../../utils/datetime";

export default class TempRoleCommand extends Command {
    public readonly name = "temprole";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.TimeInterval],
            name: "duration",
            errors: {
                required: "Please provide a duration and a role!",
                "type:invalid": "You've specified an invalid duration."
            },
            time: {
                unit: "ms"
            }
        },
        {
            types: [ArgumentType.Member],
            entity: {
                notNull: true
            },
            name: "member",
            errors: {
                "entity:null": "That member does not exist!",
                required: "Please provide a target member!",
                "type:invalid": "You've specified an invalid member."
            }
        },
        {
            types: [ArgumentType.Role],
            entity: {
                notNull: true
            },
            name: "role",
            errors: {
                "entity:null": "That role does not exist!",
                required: "Please provide a target role!",
                "type:invalid": "You've specified an invalid role."
            }
        },
        {
            types: [ArgumentType.TimeInterval],
            name: "offset",
            errors: {
                required: "Please provide a valid offset duration!",
                "type:invalid": "You've specified an invalid offset duration."
            },
            time: {
                unit: "ms"
            },
            optional: true,
            default: 0
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageRoles];
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("member").setDescription("The target member").setRequired(true))
        .addRoleOption(option => option.setName("role").setDescription("The target role to give").setRequired(true))
        .addStringOption(option =>
            option.setName("duration").setDescription("The duration after the system should revoke the role").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("start_after").setDescription("The offset duration after the system should assign the role")
        );
    public readonly description = "Temporarily give a role to a member";
    public readonly since = "6.25.2";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);
        const member: GuildMember = context.isLegacy ? context.parsedNamedArgs.member : context.options.getMember("member");

        if (!member) {
            await this.error(message, "Invalid member specified!");
            return;
        }

        const role: Role = context.isLegacy ? context.parsedNamedArgs.role : context.options.getRole("role", true);
        const duration: number = context.isLegacy
            ? context.parsedNamedArgs.duration ?? 0
            : stringToTimeInterval(context.options.getString("duration", true), {
                  milliseconds: true
              });
        const offset: number = context.isLegacy
            ? context.parsedNamedArgs.offset ?? 0
            : stringToTimeInterval(context.options.getString("start_after") ?? "0s", {
                  milliseconds: true
              });
        const totalDuration = offset + duration;

        if (offset === 0) {
            await member.roles.add(role, "Adding role to member as the I was commanded to do so");
        } else {
            await this.client.queueManager.add(
                new QueueEntry({
                    args: [message.member!.user.id, role.id],
                    client: this.client,
                    createdAt: new Date(),
                    filePath: path.resolve(__dirname, "../../queues/TempRoleAddQueue"),
                    guild: message.guild!,
                    name: "TempRoleAddQueue",
                    userId: message.member!.user.id,
                    willRunAt: new Date(Date.now() + offset)
                })
            );
        }

        await this.client.queueManager.add(
            new QueueEntry({
                args: [message.member!.user.id, role.id],
                client: this.client,
                createdAt: new Date(),
                filePath: path.resolve(__dirname, "../../queues/TempRoleRemoveQueue"),
                guild: message.guild!,
                name: "TempRoleRemoveQueue",
                userId: message.member!.user.id,
                willRunAt: new Date(Date.now() + totalDuration)
            })
        );

        await this.success(
            message,
            `Successfully ${
                offset === 0 ? "added the given role to the member" : " queued a job to add the role to the member"
            }. I'll take away the role ${time(new Date(Date.now() + totalDuration), "R")}.`
        );
    }
}
