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
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import UserArgument from "@framework/arguments/UserArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { User, type GuildTextBasedChannel } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type ClearReactionsCommandArgs = {
    user?: User;
    count?: number;
};

@ArgumentSchema.Definition({
    names: ["user", "count"],
    types: [UserArgument<true>, IntegerArgument],
    optional: true,
    errorMessages: [
        {
            ...UserArgument.defaultErrors,
            [ErrorType.Required]:
                "You must specify a message count or a user to clear message reactions.",
            [ErrorType.InvalidRange]: "Message count must be between 1 and 100."
        }
    ],
    rules: [
        {},
        {
            "range:min": 1,
            "range:max": 100
        }
    ],
    interactionName: "user",
    interactionType: UserArgument<true>,
    interactionRuleIndex: 0
})
@ArgumentSchema.Definition({
    names: ["count"],
    types: [IntegerArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid message count provided.",
            [ErrorType.InvalidRange]: "Message count must be between 1 and 100."
        }
    ],
    rules: [
        {
            "range:min": 1,
            "range:max": 100
        }
    ],
    interactionName: "count",
    interactionType: IntegerArgument,
    interactionRuleIndex: 0
})
class ClearReactionsCommand extends Command {
    public override readonly name = "clearreactions";
    public override readonly description = "Clears message reactions from a channel.";
    public override readonly detailedDescription =
        "Clear message reactions from a channel. You can specify a user to clear message reactions from, or a message count.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly defer = true;
    public override readonly usage = ["<count: Integer>", "<user: User> [count: Integer]"];
    public override aliases: string[] = ["clearrc", "cr"];
    public override readonly since: string = "10.35.0";

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option => option.setName("user").setDescription("The target user"))
                .addIntegerOption(option =>
                    option
                        .setName("count")
                        .setDescription("The number of messages to check for reactions.")
                        .setMinValue(1)
                        .setMaxValue(100)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the infraction.")
                        .setMaxLength(Limits.Reason)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "The channel to clear reactions from. Defaults to the current channel."
                        )
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: ClearReactionsCommandArgs
    ): Promise<void> {
        const { user, count } = args;

        if (!user && !count) {
            await context.error("You must specify a message count or a user to clear reactions.");
            return;
        }

        if (context.isLegacy()) {
            await context.deleteOriginalMessage().catch(this.application.logger.error);
        }

        const result = await this.infractionManager.createClearMessageReactions({
            guildId: context.guildId,
            moderator: context.user,
            user,
            count,
            channel: ((context.isChatInput() ? context.options.getChannel("channel") : undefined) ??
                context.channel) as GuildTextBasedChannel,
            reason: context.isChatInput()
                ? (context.options.getString("reason") ?? undefined)
                : undefined,
            respond: true,
            attachments: context.isLegacy() ? [...context.attachments.values()] : []
        });

        if (result.status === "failed") {
            await context.error(result.errorDescription ?? "Failed to perform this action.");
            return;
        }
    }
}

export default ClearReactionsCommand;
