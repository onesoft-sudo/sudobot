/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import Command from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { getEnvData } from "@main/env/env";
import {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageFlags
} from "discord.js";
import metadata from "@root/package.json";

class AboutCommand extends Command {
    public override readonly name: string = "about";
    public override readonly description: string = "Show information about the bot.";
    public override readonly aliases: string[] = ["botinfo"];

    public override async execute(context: Context): Promise<void> {
        const env = getEnvData();
        const avatar = this.application.client.user?.displayAvatarURL();
        const emoji = context.emoji("sudobot") || null;
        const codeName = metadata._meta.release_codename;
        const shortCodeName = metadata._meta.release_short_codename;

        const container = new ContainerBuilder();
        const topHeader = new TextDisplayBuilder().setContent(
            [
                `## ${emoji ? emoji.toString() + " " : ""}SudoBot ${shortCodeName}`,
                "### A free and open source Discord moderation bot.",
                "This bot is **free software**, and you are welcome to redistribute it under certain conditions.",
                "If you make changes to the bot, you must make the source code of the modified version available to the public, under the same license.",
                "See the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html) for more detailed information.",
                env.SUDOBOT_HIDE_MODIFICATIONS_URL_NOTICE !== "1" && !env.SUDOBOT_MODIFICATIONS_PUBLIC_URL
                    ? "\n**Notice:** If you make changes to the bot, as stated above, please make your changes public, and set the `MODIFICATIONS_PUBLIC_URL` environment variable to the URL of the source code of the modified version, which should be publicly accessible.\n" +
                      'To hide this notice, set the `HIDE_MODIFICATIONS_URL_NOTICE` environment variable to `"1"`'
                    : "",
                env.SUDOBOT_MODIFICATIONS_PUBLIC_URL
                    ? "\n### Modifications" +
                      "This bot has been modified by the developers of this instance.\n" +
                      "According to **The GNU Affero General Public License v3**, the source code of the modifications must be made available to the public, under the same license.\n" +
                      "You can view the source code of this modified version [here](${env.MODIFICATIONS_PUBLIC_URL})."
                    : ""
            ]
                .filter(Boolean)
                .join("\n")
        );

        if (avatar) {
            const topSection = new SectionBuilder().addTextDisplayComponents(topHeader);
            topSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar));
            container.addSectionComponents(topSection);
        }
        else {
            container.addTextDisplayComponents(topHeader);
        }

        container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large));

        const versionSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Version:** ${metadata.version}\n**Codename:** ${codeName}`)
            )
            .setButtonAccessory(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(metadata.repository.url).setLabel("Source Code")
            );

        container.addSectionComponents(versionSection);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Author:** [${metadata.author.name}](${metadata.author.url})`)
        );

        const supportSection = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("### Need Help?"))
            .setButtonAccessory(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://docs.sudobot.onesoftnet.eu.org")
                    .setLabel("Documentation")
            );

        container.addSectionComponents(supportSection);
        container.addActionRowComponents(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL("https://docs.sudobot.onesoftnet.eu.org/getting-started#help--support")
                    .setLabel("Contact Us"),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(metadata.funding.url).setLabel("Donate")
            )
        );

        container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# Copyright © OSN Developers and the contributors 2022-${new Date().getFullYear()}.`
            )
        );

        await context.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });
    }
}

export default AboutCommand;
