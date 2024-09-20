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
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { GuildMember } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type ModMessageCommandArgs = {
    member: GuildMember;
    message?: string;
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
    names: ["message"],
    types: [RestStringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid message content provided.",
            [ErrorType.Required]: "You must provide a message to send to the member.",
            [ErrorType.InvalidRange]: `The message must be between 1 and ${Limits.Reason} characters long.`
        }
    ],
    rules: [ArgumentDefaultRules.Reason],
    interactionRuleIndex: 0,
    interactionName: "message",
    interactionType: RestStringArgument
})
class ModMessageCommand extends Command {
    public override readonly name = "modmsg";
    public override readonly description: string = "Sends a moderator message to a member.";
    public override readonly detailedDescription =
        "Sends a moderator message to a member. This command is used to send a message to a member that is not a warning directly.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly defer = true;
    public override readonly usage = ["<member: GuildMember> [message: RestString]"];
    public override readonly aliases = ["moderatormessage"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option.setName("member").setDescription("The target member.").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription("The content of the message to send to the member")
                        .setMaxLength(Limits.Reason)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: ModMessageCommandArgs
    ): Promise<void> {
        const { member, message } = args;

        if (
            !context.member ||
            !(await this.permissionManager.canModerate(member, context.member))
        ) {
            await context.error(
                "You don't have permission to send moderator messages to this member!"
            );

            return;
        }

        const { overviewEmbed, status } = await this.infractionManager.createModeratorMessage({
            guildId: context.guildId,
            moderator: context.user,
            reason: message,
            member,
            generateOverviewEmbed: true,
            notify: true
        });

        if (status === "failed") {
            await context.error("Failed to send the message.");
            return;
        }

        await context.reply({ embeds: [overviewEmbed] });
    }
}

export default ModMessageCommand;
