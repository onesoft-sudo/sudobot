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

import type { ChatContext } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import { env } from "@main/env/env";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { MetadataType } from "../../core/DiscordKernel";

class AboutCommand extends Command {
    public override readonly name = "about";
    public override readonly description = "Get information about the bot.";
    public override readonly aliases = ["botinfo"];

    public override async execute(context: ChatContext) {
        const metadata = this.application.metadata as MetadataType;
        const avatar = this.application.getClient().user?.displayAvatarURL();
        const emoji = context.emoji("sudobot") || null;
        const codeName = metadata._meta.release_codename;
        const shortCodeName = metadata._meta.release_short_codename;

        await context.reply({
            embeds: [
                {
                    thumbnail: avatar
                        ? {
                              url: avatar
                          }
                        : undefined,
                    description: (
                        `
                        ## ${emoji ? emoji.toString() + " " : ""}SudoBot ${shortCodeName}\n
                        ### A free and open source Discord moderation bot.\n
                        This bot is **free software**, and you are welcome to redistribute it under certain conditions.
                        If you make changes to the bot, you must make the source code of the modified version available to the public, under the same license.
                        See the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html) for more detailed information.
                    ` +
                        (env.HIDE_MODIFICATIONS_URL_NOTICE !== "1" && !env.MODIFICATIONS_PUBLIC_URL
                            ? `
                        **Notice:** If you make changes to the bot, as stated above, please make your changes public, and set the \`MODIFICATIONS_PUBLIC_URL\` environment variable to the URL of the source code of the modified version, which should be publicly accessible.
                        To hide this notice, set the \`HIDE_MODIFICATIONS_URL_NOTICE\` environment variable to \`"1"\`.    
                        `
                            : "") +
                        (env.MODIFICATIONS_PUBLIC_URL
                            ? `
                        ### Modifications\n
                        This bot has been modified by the developers of this instance.\n
                        According to **The GNU Affero General Public License v3**, the source code of the modifications must be made available to the public, under the same license.\n
                        You can view the source code of this modified version [here](${env.MODIFICATIONS_PUBLIC_URL}).
                        `
                            : "")
                    ).replaceAll(/\n([ \t]+)/gm, "\n"),
                    color: 0x007bff,
                    fields: [
                        {
                            name: "Version",
                            value: `**${metadata.version}** (${codeName})`,
                            inline: true
                        },
                        {
                            name: "Source Code",
                            value: `[GitHub](${metadata.repository.url})`,
                            inline: true
                        },
                        {
                            name: "Author",
                            value: `[${metadata.author.name}](${metadata.author.url})`,
                            inline: true
                        },
                        {
                            name: "Support",
                            value: "[Contact Us](https://docs.sudobot.onesoftnet.eu.org/getting-started#help--support)",
                            inline: true
                        },
                        {
                            name: "Documentation",
                            value: "[SudoBot Docs](https://docs.sudobot.onesoftnet.eu.org)",
                            inline: true
                        }
                    ],
                    footer: {
                        text: `Copyright © OSN Developers and the contributors 2022-${new Date().getFullYear()}.`
                    }
                }
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(metadata.funding.url)
                        .setLabel("Donate")
                )
            ]
        });
    }
}

export default AboutCommand;
