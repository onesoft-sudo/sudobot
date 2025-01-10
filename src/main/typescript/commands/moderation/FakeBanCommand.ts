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
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { also } from "@framework/utils/utils";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { GuildMember } from "discord.js";
import { Colors } from "../../constants/Colors";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";
import { ErrorMessages } from "../../utils/ErrorMessages";

type FakeBanCommandArgs = {
    member: GuildMember;
    reason?: string;
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
    names: ["reason"],
    types: [RestStringArgument],
    optional: true,
    errorMessages: [ErrorMessages.Reason],
    rules: [ArgumentDefaultRules.Reason],
    interactionRuleIndex: 0,
    interactionName: "reason",
    interactionType: RestStringArgument
})
class FakeBanCommand extends Command {
    public override readonly name = "fakeban";
    public override readonly description = "Fake bans a member.";
    public override readonly detailedDescription =
        "Sends a DM to the member telling them they've been banned. It doesn't actually do anything.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly defer = true;
    public override readonly usage = ["<member: GuildMember> [reason: RestString]"];
    public override readonly aliases = ["fban"];

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
                        .setDescription("The member to fakeban.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the ban.")
                        .setMaxLength(Limits.Reason)
                )
                .addBooleanOption(option =>
                    option
                        .setName("notify")
                        .setDescription("Whether to notify the user. Defaults to true.")
                        .setRequired(false)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: FakeBanCommandArgs
    ): Promise<void> {
        const { member, reason } = args;

        if (
            !context.member ||
            !(await this.permissionManager.canModerate(member, context.member))
        ) {
            await context.error("You don't have permission to fakeban this member!");
            return;
        }

        const { overviewEmbed, status } = await this.infractionManager.createFakeBan({
            guildId: context.guildId,
            moderator: context.user,
            reason,
            user: member.user,
            generateOverviewEmbed: true,
            notify: !context.isChatInput() || context.options.getBoolean("notify") !== false,
            transformNotificationEmbed: embed => also(embed, e => void (e.color = Colors.Success)),
            attachments: context.isLegacy() ? [...context.attachments.values()] : []
        });

        if (status === "failed") {
            await context.error("Failed to ban member.");
            return;
        }

        await context.reply({ embeds: [overviewEmbed] });
    }
}

export default FakeBanCommand;
