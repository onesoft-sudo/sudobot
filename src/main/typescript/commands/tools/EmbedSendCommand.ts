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
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import type LegacyContext from "@framework/commands/LegacyContext";
import type InteractionContext from "@framework/commands/InteractionContext";
import type { ChatInputCommandInteraction, GuildBasedChannel } from "discord.js";
import { generateEmbed } from "@main/utils/embed";

class EmbedSendCommand extends Command {
    public override readonly name: string = "embed::send";
    public override readonly description: string = "Send an embed.";
    public override readonly usage = [""];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.ManageMessages
    ];
    public override readonly permissionCheckingMode = "or";

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ) {
        if (context.isLegacy()) {
            await context.error("This subcommand is not available in legacy mode.");
            return;
        }

        await context.defer({
            ephemeral: true
        });

        const { embed, error } = generateEmbed(context.options);

        if (error) {
            await context.error(error);
            return;
        }

        const channel =
            (context.options.getChannel("channel") as GuildBasedChannel) ?? context.channel;

        if (!channel?.isTextBased()) {
            await context.error("Invalid channel given.");
            return;
        }

        try {
            await channel.send({
                embeds: [embed!]
            });

            await context.reply({ content: "Message sent." });
        } catch (e) {
            await context.error({ content: "Invalid options given." });
        }
    }
}

export default EmbedSendCommand;