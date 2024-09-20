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
import DurationArgument from "@framework/arguments/DurationArgument";
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import RestRoleArgument from "@main/arguments/RestRoleArgument";
import { GuildMember, Role } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type RoleCommandArgs = {
    member: GuildMember;
    roles: Role[];
    duration?: Duration|null;
};

@ArgumentSchema.Definition({
    names: ["member"],
    types: [GuildMemberArgument<true>],
    optional: false,
    errorMessages: [GuildMemberArgument.defaultErrors],
    interactionName: "member",
    interactionType: GuildMemberArgument<true>
})
@ArgumentSchema.Definition({
    names: ["duration", "roles"],
    types: [DurationArgument, RestRoleArgument<true>],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "You must specify a valid duration to perform this action."
        },
        RestRoleArgument.defaultErrors
    ],
    rules: [
        {},
        {
            "role_rest:all_required": true
        }
    ],
    interactionName: "duration",
    interactionType: DurationArgument
})
@ArgumentSchema.Definition({
    names: ["roles"],
    types: [RestRoleArgument<true>],
    optional: true,
    errorMessages: [RestRoleArgument.defaultErrors],
    rules: [
        {
            "role_rest:all_required": true
        }
    ],
    interactionName: "roles",
    interactionType: RestRoleArgument<true>
})
class RoleCommand extends Command {
    public override readonly name = "role";
    public override readonly description = "Assigns roles to a member.";
    public override readonly detailedDescription =
        "Assigns roles to a member. This command can be used to add/remove roles for indefinite or temporary periods of time.";
    public override readonly permissions = [PermissionFlags.ManageRoles];
    public override readonly defer = true;
    public override readonly usage = ["<member: GuildMember> <...Roles: Role[]>"];
    public override readonly aliases = ["giverole", "takerole", "temprole"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to assign the roles to.")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("roles")
                        .setDescription("The roles to assign to the member.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for this action.")
                        .setMaxLength(Limits.Reason)
                )
                .addStringOption(option =>
                    option
                        .setName("duration")
                        .setDescription("The duration of the role assignment/removal.")
                )
                .addStringOption(option =>
                    option
                        .setName("mode")
                        .setDescription(
                            "The mode of the role assignment/removal. Defaults to give."
                        )
                        .setChoices(
                            {
                                name: "Give",
                                value: "give"
                            },
                            {
                                name: "Take",
                                value: "take"
                            }
                        )
                )
                .addBooleanOption(option =>
                    option
                        .setName("notify")
                        .setDescription("Whether to notify the user. Defaults to false.")
                        .setRequired(false)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: RoleCommandArgs
    ): Promise<void> {
        const { member, roles, duration } = args;

        if (
            !context.member ||
            !(await this.permissionManager.canModerate(member, context.member))
        ) {
            await context.error("You don't have permission to moderate this member!");
            return;
        }

        if (!roles?.length) {
            await context.error("You must specify at least one role to perform this action!");
            return;
        }

        if (context.commandName === "temprole" && !duration) {
            await context.error("You must specify a valid duration to perform this action!");
            return;
        }

        const result = await this.infractionManager.createRoleModification({
            guildId: context.guildId,
            moderator: context.user,
            reason: context.isChatInput()
                ? (context.options.getString("reason") ?? undefined)
                : undefined,
            member,
            generateOverviewEmbed: true,
            notify: context.isChatInput() && !!context.options.getBoolean("notify"),
            mode: context.isChatInput()
                ? ((context.options.getString("mode") as "give" | "take" | null) ?? "give")
                : context.commandName === "takerole"
                  ? "take"
                  : "give",
            roles,
            duration: duration ?? undefined
        });

        if (result.status === "failed") {
            await context.error(result.errorDescription ?? "Failed to complete the operation.");
            return;
        }

        await context.reply({ embeds: [result.overviewEmbed] });
    }
}

export default RoleCommand;
