/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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
import type { ChatInputCommandInteraction } from "discord.js";
import { generateEmbed } from "@main/utils/embed";
import JSON5 from "json5";

class EmbedSchemaCommand extends Command {
    public override readonly name: string = "embed::schema";
    public override readonly description: string = "Generate a reusable schema for an embed.";
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

        if (!embed) {
            return;
        }

        const schema: string = JSON5.stringify(embed.toJSON());

        await context.reply({
            content: `Successfully generated embed schema:\n\n\`\`\`\n${schema}\n\`\`\`\nYou can now reuse this schema as many times as you want to send embeds.`
        });
    }
}

export default EmbedSchemaCommand;