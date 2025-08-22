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

import type { Buildable, SubcommandMeta } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type InteractionContext from "@framework/commands/InteractionContext";
import type LegacyContext from "@framework/commands/LegacyContext";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { fetchMember, fetchRole } from "@framework/utils/entities";
import type {
    ChatInputCommandInteraction,
    Collection,
    GuildMember,
    Role,
    Snowflake
} from "discord.js";

class ManageRoleCommand extends Command {
    public override readonly name = "managerole";
    public override readonly description: string = "Manage member roles.";
    public override readonly usage = ["<subcommand: String> [...args: Any[]]"];
    public override readonly aliases = ["manageroles"];
    public override readonly subcommands = ["add", "remove"];
    public override readonly permissions = [PermissionFlags.Administrator];
    public override readonly subcommandMeta: Record<string, SubcommandMeta> = {
        add: {
            description: "Bulk-add roles to members"
        },
        remove: {
            description: "Bulk-remove roles from members"
        }
    };

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Bulk-add roles to members")
                        .addStringOption(option =>
                            option
                                .setName("targets")
                                .setDescription(
                                    "Member ID or role *mentions* seperated by spaces"
                                )
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("roles")
                                .setDescription(
                                    "Role ID/mentions seperated by spaces"
                                )
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Bulk-remove roles from members")
                        .addStringOption(option =>
                            option
                                .setName("targets")
                                .setDescription(
                                    "Member ID or role *mentions* seperated by spaces"
                                )
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("roles")
                                .setDescription(
                                    "Role ID/mentions seperated by spaces"
                                )
                                .setRequired(true)
                        )
                )
        ];
    }

    public override async execute(
        context: InteractionContext<ChatInputCommandInteraction> | LegacyContext
    ): Promise<void> {
        const subcommand = context.isChatInput()
            ? context.options.getSubcommand(true)
            : context.args[0];

        switch (subcommand) {
            case "add":
                return this.add(context);

            case "remove":
                return this.remove(context);
        }
    }

    private async add(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const targetIds = context.isLegacy()
            ? [context.args[1]]
            : context.options.getString("targets", true).split(/\s+/);
        const roleExpressions = context.isLegacy()
            ? context.args.slice(2)
            : context.options.getString("roles", true).split(/\s+/);

        if (targetIds.length < 0) {
            await context.error("You must specify at least one target!");
            return;
        }

        if (roleExpressions.length < 0) {
            await context.error(
                "You must specify at least one role to assign to the given target(s)!"
            );
            return;
        }

        if (context.isLegacy()) {
            await context.commandMessage.react(context.emoji("loading"));
        } else {
            await context.defer();
        }

        const roles = await this.processRoleList(context, roleExpressions);

        if (roles === null) {
            return;
        }

        if (roles.length !== roleExpressions.length) {
            await context.error(
                `Failed to fetch information for **${roleExpressions.length - roles.length}** roles given - please double check your role ID/mentions!`
            );
            return;
        }

        const { failed, invalidIds, members } = await this.processTargetList(
            context,
            targetIds
        );

        if (failed) {
            return;
        }

        let failedCount = 0,
            successfulCount = 0;

        for (const member of members) {
            try {
                await member.roles.add(roles, "Bulk-add roles");
                successfulCount++;
            } catch (error) {
                this.application.logger.error(error);
                failedCount++;
            }
        }

        await context.success(
            `Operation complete: **${successfulCount}** successful, **${failedCount}** failed, **${invalidIds}** invalid target ID/mention(s).`
        );
    }

    private async remove(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const targetIds = context.isLegacy()
            ? [context.args[1]]
            : context.options.getString("targets", true).split(/\s+/);
        const roleExpressions = context.isLegacy()
            ? context.args.slice(2)
            : context.options.getString("roles", true).split(/\s+/);

        if (targetIds.length < 0) {
            await context.error("You must specify at least one target!");
            return;
        }

        if (roleExpressions.length < 0) {
            await context.error(
                "You must specify at least one role to remove from the given target(s)!"
            );
            return;
        }

        if (context.isLegacy()) {
            await context.commandMessage.react(context.emoji("loading"));
        } else {
            await context.defer();
        }

        const roles = await this.processRoleList(context, roleExpressions);

        if (roles === null) {
            return;
        }

        if (roles.length !== roleExpressions.length) {
            await context.error(
                `Failed to fetch information for **${roleExpressions.length - roles.length}** roles given - please double check your role ID/mentions!`
            );
            return;
        }

        const { failed, invalidIds, members } = await this.processTargetList(
            context,
            targetIds
        );

        if (failed) {
            return;
        }

        let failedCount = 0,
            successfulCount = 0;

        for (const member of members) {
            try {
                await member.roles.remove(roles, "Bulk-remove roles");
                successfulCount++;
            } catch (error) {
                this.application.logger.error(error);
                failedCount++;
            }
        }

        await context.success(
            `Operation complete: **${successfulCount}** successful, **${failedCount}** failed, **${invalidIds}** invalid target ID/mention(s).`
        );
    }

    private async processTargetList(
        context:
            | LegacyContext
            | InteractionContext<ChatInputCommandInteraction>,
        targetIds: string[]
    ) {
        let invalidIds = 0;

        let members: Collection<Snowflake, GuildMember> | null = null;
        const resultMembers: GuildMember[] = [];

        for (const targetId of targetIds) {
            if (
                targetId === "@everyone" ||
                targetId === `<@&${context.guildId}>`
            ) {
                if (!members) {
                    try {
                        members = await context.guild.members.fetch({
                            withPresences: false
                        });
                    } catch (error) {
                        this.application.logger.error(error);
                        await context.error(
                            "Failed to fetch a list of members in this server"
                        );
                        return {
                            failed: true,
                            invalidIds,
                            members: resultMembers
                        };
                    }
                }

                return {
                    invalidIds,
                    members: [...(members?.values() || [])]
                };
            } else if (targetId.startsWith("<@&") && targetId.endsWith(">")) {
                const roleId = targetId.slice(3, targetId.length - 1);

                if (!roleId || !/^\d+$/.test(roleId)) {
                    invalidIds++;
                    continue;
                }

                if (!members) {
                    try {
                        members = await context.guild.members.fetch({
                            withPresences: false
                        });
                    } catch (error) {
                        this.application.logger.error(error);
                        await context.error(
                            "Failed to fetch a list of members in this server"
                        );
                        return {
                            failed: true,
                            invalidIds,
                            members: resultMembers
                        };
                    }
                }

                for (const member of members.values()) {
                    if (member.roles.cache.has(targetId)) {
                        resultMembers.push(member);
                    }
                }
            } else if (/^\d+$/.test(targetId)) {
                try {
                    const member = await fetchMember(context.guild, targetId);

                    if (!member) {
                        invalidIds++;
                    } else {
                        resultMembers.push(member);
                    }
                } catch (error) {
                    this.application.logger.error(error);
                    invalidIds++;
                }
            } else {
                invalidIds++;
                continue;
            }
        }

        return {
            invalidIds,
            members: resultMembers
        };
    }

    private async processRoleList(
        context:
            | LegacyContext
            | InteractionContext<ChatInputCommandInteraction>,
        roleExpressions: string[]
    ) {
        const roles: Role[] = [];

        for (const roleExpression of roleExpressions) {
            const roleId =
                roleExpression.startsWith("<@&") && roleExpression.endsWith(">")
                    ? roleExpression.slice(3, roleExpression.length - 1)
                    : roleExpression;

            if (!/^\d+$/.test(roleId)) {
                await context.error("One of the roles given is invalid!");
                return null;
            }

            const role = await fetchRole(context.guild, roleId);

            if (role) {
                roles.push(role);
            }
        }

        return roles;
    }
}

export default ManageRoleCommand;
