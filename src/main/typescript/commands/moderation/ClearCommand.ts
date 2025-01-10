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
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import {
    Message,
    User,
    type Awaitable,
    type GuildTextBasedChannel,
    type Interaction
} from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type ClearCommandArgs = {
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
            [ErrorType.Required]: "You must specify a message count or a user to clear messages.",
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
class ClearCommand extends Command {
    public override readonly name = "clear";
    public override readonly description = "Clears messages from a channel.";
    public override readonly detailedDescription =
        "Clear messages from a channel. You can specify a user to clear messages from, or a message count.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly defer = true;
    public override readonly usage = ["<count: Integer>", "<user: User> [count: Integer]"];

    public static readonly filters: Record<string, (message: Message) => Awaitable<boolean>> = {
        bot: message => message.author.bot,
        user: message => !message.author.bot,
        not_pinned: message => !message.pinned,
        embed: message => message.embeds.length > 0,
        attachment: message => message.attachments.size > 0,
        link: message => /https?:\/\/\S+/.test(message.content)
    };

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
                        .setDescription("The number of messages to clear.")
                        .setMinValue(1)
                        .setMaxValue(100)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the warning.")
                        .setMaxLength(Limits.Reason)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "The channel to clear messages from. Defaults to the current channel."
                        )
                )
                .addStringOption(option =>
                    option
                        .setName("filters")
                        .setDescription(
                            "The filters to apply to the messages. Separate multiple filters with a comma."
                        )
                        .setAutocomplete(true)
                )
        ];
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isAutocomplete() || interaction.commandName !== "clear") {
            return;
        }

        const value = interaction.options.getFocused();
        const relevantFilters: Array<{ name: string; value: string }> = [];

        for (const key in ClearCommand.filters) {
            if (key.includes(value)) {
                relevantFilters.push({
                    name: key,
                    value: key
                });
            }
        }

        if (interaction.responded) {
            return;
        }

        await interaction.respond(relevantFilters).catch(this.application.logger.error);
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: ClearCommandArgs
    ): Promise<void> {
        const { user, count } = args;

        if (!user && !count) {
            await context.error("You must specify a message count or a user to clear messages.");
            return;
        }

        if (context.isLegacy()) {
            await context.deleteOriginalMessage().catch(this.application.logger.error);
        }

        const filters = [];

        if (context.isChatInput()) {
            const filterString = context.options.getString("filters") ?? "";
            const filterArray = filterString.split(",").filter(Boolean);

            for (const filter of filterArray) {
                if (ClearCommand.filters[filter]) {
                    filters.push(ClearCommand.filters[filter]);
                } else {
                    await context.error(`Invalid filter: ${filter}`);
                    return;
                }
            }
        }

        const result = await this.infractionManager.createClearMessages({
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
            filters,
            attachments: context.isLegacy() ? [...context.attachments.values()] : []
        });

        if (result.status === "failed") {
            await context.error(result.errorDescription ?? "Failed to perform this action.");
            return;
        }
    }
}

export default ClearCommand;
