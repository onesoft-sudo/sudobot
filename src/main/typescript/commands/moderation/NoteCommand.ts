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
import RestStringArgument from "@framework/arguments/RestStringArgument";
import UserArgument from "@framework/arguments/UserArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { ErrorMessages } from "@main/utils/ErrorMessages";
import { User } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type NoteCommandArgs = {
    user: User;
    reason?: string;
};

@ArgumentSchema.Definition({
    names: ["user"],
    types: [UserArgument<true>],
    optional: false,
    errorMessages: [UserArgument.defaultErrors],
    interactionName: "user",
    interactionType: UserArgument<true>
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
class NoteCommand extends Command {
    public override readonly name = "note";
    public override readonly description: string = "Takes a note on a user.";
    public override readonly detailedDescription: string =
        "Takes a note on a user. Notes are saved as infractions, but are not considered like warnings or mutes. They are simply for record-keeping purposes.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly defer = true;
    public override readonly usage = ["<user: User> [reason: RestString]"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option.setName("user").setDescription("The target user").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the note.")
                        .setMaxLength(Limits.Reason)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: NoteCommandArgs
    ): Promise<void> {
        const { user, reason } = args;

        const { overviewEmbed, status } = await this.infractionManager.createNote({
            guildId: context.guildId,
            moderator: context.user,
            reason,
            user,
            generateOverviewEmbed: true,
            attachments: context.isLegacy() ? [...context.attachments.values()] : []
        });

        if (status === "failed") {
            await context.error("Failed to take note.");
            return;
        }

        await context.reply({ embeds: [overviewEmbed] });
    }
}

export default NoteCommand;
