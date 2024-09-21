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

import { Command } from "@framework/commands/Command";
import { ContextType } from "@framework/commands/ContextType";
import type InteractionContext from "@framework/commands/InteractionContext";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import type { ChatInputCommandInteraction, Guild } from "discord.js";

class SetupCommand extends Command<ContextType> {
    public override readonly name = "setup";
    public override readonly description: string = "Setup the bot for this server.";
    public override readonly usage = [""];
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly supportedContexts = [ContextType.ChatInput];

    public override async execute(context: InteractionContext<ChatInputCommandInteraction>) {
        const { commandMessage } = context;

        if (!context.member || !commandMessage.guild) {
            await context.error("This command can only be used in a server.");
            return;
        }

        await this.application.service("guildSetupService").initialize(
            commandMessage as ChatInputCommandInteraction & {
                guild: Guild;
            }
        );
    }
}

export default SetupCommand;
