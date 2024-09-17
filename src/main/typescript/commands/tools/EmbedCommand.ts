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

import AbstractRootCommand from "@framework/commands/AbstractRootCommand";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import type { Buildable } from "@framework/commands/Command";
import type { ChannelType } from "discord.js";
import { type SlashCommandSubcommandBuilder } from "discord.js";
import { TextableChannelTypes } from "@framework/utils/channel";

class EmbedCommand extends AbstractRootCommand {
    public override readonly name: string = "embed";
    public override readonly description: string = "Create and manage embeds.";
    public override readonly usage = ["<subcommand: String> [...args: String[]]"];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.ManageMessages
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly isolatedSubcommands = true;
    public override readonly aliases = ["embeds"];
    public override readonly subcommands = ["send", "schema", "build"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    this.buildEmbedOptions(
                        subcommand.setName("send").setDescription("Send an embed.")
                    ).addChannelOption(option =>
                        option
                            .setName("channel")
                            .setDescription("The channel to send the embed in")
                            .addChannelTypes(...(TextableChannelTypes as ChannelType.GuildText[]))
                    )
                )
                .addSubcommand(subcommand =>
                    this.buildEmbedOptions(
                        subcommand
                            .setName("schema")
                            .setDescription("Create an embed schema for later use.")
                    )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("build")
                        .setDescription("Build and send an embed using a schema.")
                        .addStringOption(option =>
                            option
                                .setName("schema")
                                .setDescription("The schema to use")
                                .setRequired(true)
                        )
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("The channel to send the embed in")
                                .addChannelTypes(
                                    ...(TextableChannelTypes as ChannelType.GuildText[])
                                )
                        )
                )
        ];
    }

    private buildEmbedOptions(builder: SlashCommandSubcommandBuilder) {
        return builder
            .addStringOption(option =>
                option.setName("author_name").setDescription("The embed author name")
            )
            .addStringOption(option =>
                option.setName("author_icon_url").setDescription("The embed author icon URL")
            )
            .addStringOption(option => option.setName("title").setDescription("The embed title"))
            .addStringOption(option =>
                option.setName("description").setDescription("The embed description")
            )
            .addStringOption(option =>
                option.setName("thumbnail").setDescription("The embed thumbnail URL")
            )
            .addStringOption(option =>
                option.setName("image").setDescription("The embed image attachment URL")
            )
            .addStringOption(option =>
                option.setName("video").setDescription("The embed video attachment URL")
            )
            .addStringOption(option =>
                option.setName("footer_text").setDescription("The embed footer text")
            )
            .addStringOption(option =>
                option.setName("footer_icon_url").setDescription("The embed footer icon URL")
            )
            .addStringOption(option =>
                option
                    .setName("timestamp")
                    .setDescription("The embed timestamp, use 'current' to set current date")
            )
            .addStringOption(option =>
                option.setName("color").setDescription("The embed color (default is #007bff)")
            )
            .addStringOption(option => option.setName("url").setDescription("The embed URL"))
            .addStringOption(option =>
                option
                    .setName("fields")
                    .setDescription(
                        "The embed fields, should be in `Field 1: Value 1, Field 2: Value 2` format"
                    )
            );
    }
}

export default EmbedCommand;
