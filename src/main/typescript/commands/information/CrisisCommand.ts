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

import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type InteractionContext from "@framework/commands/InteractionContext";
import type LegacyContext from "@framework/commands/LegacyContext";
import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";

class CrisisCommand extends Command {
    public override readonly name = "crisis";
    public override readonly description: string = "Show the crisis numbers of a country.";
    public override readonly defer = true;
    public override readonly usage = ["<countryCode: String>"];
    public override readonly systemPermissions = [];

    protected readonly countryInfo = {
        "United Kingdom": [
            "BEAT ED Helpline - 0808 801",
            "Switchboard LGBTQI+ helpline - 0300 330 0630",
            "Mind - 0300 123 3393",
            "The mix (under 25s)- 0808 808 4994",
            "Crisis text line - Text SHOUT to 85258"
        ],
        "United States": [
            "Crisis support - 800-273-8255 (call only)",
            "National ED helpline - 800-931-2237 (text or call)",
            "LGBTQI+ hotline - 888-843-4564",
            "MH and substance abuse - 800-662-4357",
            "SH helpline S.A.F.E - 800-366-8288",
            "Suicide and crisis lifeline - 998"
        ],
        Australia: [
            "Headspace MH service - 1800 650 890",
            "Butterfly ED helpline - 1800 334 673",
            "QLIFE LGBTQI+ support - 1800 184 527",
            "Mensline aus: mens support for MH - 1300 78 99 78",
            "Suicide call back service - 1300 659 467"
        ],
        "New Zealand": [
            "Youth line - 0800 376 633/ text 234",
            "OUTLINE nz - 0800 688 5463",
            "Need to talk? -  1737 (call/text) to speak to a trained counsellor.",
            "Lifetime 24/7 helpline - 0800 543 354"
        ]
    };

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("uk")
                        .setDescription("Show the crisis numbers of United Kingdom")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("us")
                        .setDescription("Show the crisis numbers of United States")
                )
                .addSubcommand(subcommand =>
                    subcommand.setName("aus").setDescription("Show the crisis numbers of Australia")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("nz")
                        .setDescription("Show the crisis numbers of New Zealand")
                )
        ];
    }

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const countryCode: string | undefined = context.isLegacy()
            ? context.args[0]
            : context.options.getSubcommand(true);

        if (!countryCode) {
            await context.error("Please provide a country code.");
            return;
        }

        const embedBuilder = new EmbedBuilder({
            color: 0x007bff,
            footer: {
                text: "Stay safe!"
            }
        }).setTimestamp();
        let country = "";

        switch (countryCode.toLowerCase()) {
            case "uk":
            case "united kingdom":
            case "united_kingdom":
            case "united-kingdom":
            case "unitedkingdom":
                country = "United Kingdom";
                break;

            case "us":
            case "united states":
            case "united_states":
            case "united-states":
            case "unitedstates":
                country = "United States";
                break;

            case "nz":
            case "new zealand":
            case "new_zealand":
            case "new-zealand":
            case "newzealand":
                country = "New Zealand";
                break;

            case "aus":
            case "australia":
                country = "Australia";
                break;

            default:
                await context.error(
                    "Invalid country code/name provided. Please specify one of these:\nUK - United Kingdom\nUS - United States\nAUS - Australia\nNZ - New Zealand"
                );
                return;
        }

        await context.reply({
            embeds: [
                embedBuilder
                    .setAuthor({
                        name: `Showing crisis numbers of ${country}`,
                        iconURL: context.guild?.iconURL() ?? undefined
                    })
                    .setDescription(
                        this.countryInfo[country as keyof typeof this.countryInfo].join("\n")
                    )
            ]
        });
    }
}

export default CrisisCommand;
