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
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import type { Buildable, ChatContext } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import { Inject } from "@framework/container/Inject";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import { fetchChannel, fetchMember } from "@framework/utils/entities";
import DirectiveParsingService from "@main/services/DirectiveParsingService";
import {
    APIEmbed,
    escapeMarkdown,
    GuildMember,
    MessageCreateOptions,
    MessagePayload
} from "discord.js";

type BroadcastCommandArgs = {
    message: string;
};

@ArgumentSchema.Definition({
    names: ["message"],
    types: [RestStringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide a message to broadcast.",
            [ErrorType.InvalidRange]: "The message must be between 1 and 4096 characters long."
        }
    ],
    rules: [
        {
            "range:max": 4096,
            "range:min": 1
        }
    ]
})
class BroadcastCommand extends Command {
    public override readonly name = "broadcast";
    public override readonly description = "Broadcast a message to all servers.";
    public override readonly detailedDescription =
        "Broadcast a message to all servers. If a server does not have a broadcast channel set, the message will be sent to the server owner via DM.";
    public override readonly aliases = ["announce"];
    public override readonly usage = ["<...message: RestString>"];
    public override readonly systemAdminOnly = true;

    @Inject()
    protected readonly directiveParsingService!: DirectiveParsingService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption(option =>
                option
                    .setName("message")
                    .setDescription("The message to broadcast.")
                    .setRequired(true)
            )
        ];
    }

    public override async execute(context: ChatContext, args: BroadcastCommandArgs) {
        const guilds = this.application.client.guilds.cache.values();
        let failed = 0,
            success = 0,
            fallback = 0,
            total = 0;
        let options: MessageCreateOptions | MessagePayload | null = null;

        try {
            const { data, output } = await this.directiveParsingService.parse(args.message);
            options = {
                files: context.isLegacy()
                    ? context.commandMessage.attachments.map(a => ({
                          attachment: a.proxyURL,
                          name: a.name
                      }))
                    : [],
                content:
                    output.trim() === ""
                        ? undefined
                        : output +
                          "\n-# This message was broadcasted by the system administrators.",
                embeds: (data.embeds as APIEmbed[]) ?? [],
                allowedMentions: { parse: [], roles: [], users: [] }
            };
        } catch (error) {
            if (error instanceof DirectiveParseError) {
                await context.error(error.message.replace("Invalid argument: ", ""));
            } else {
                await context.error("An error occurred while parsing directives in the message.");
            }

            return;
        }

        if (!options) {
            this.application.logger.bug(
                "BroadcastCommand",
                "Options were not set after parsing directives."
            );
            return;
        }

        for (const guild of guilds) {
            total++;

            const target = guild.systemChannelId
                ? await fetchChannel(guild, guild.systemChannelId)
                : await fetchMember(guild, guild.ownerId);

            if (!target || !("send" in target)) {
                failed++;
                continue;
            }

            try {
                await target.send({
                    ...options,
                    content: options.content
                        ? options.content +
                          `${target instanceof GuildMember ? ` You are receiving this message because you are the owner of ${escapeMarkdown(guild.name)}.` : ""}`
                        : undefined
                });

                if (target instanceof GuildMember) {
                    fallback++;
                }

                success++;
            } catch (error) {
                failed++;
            }
        }

        await context.success(
            `Broadcasted the message to **${total}** servers. **${success}** successful, **${failed}** failed, **${fallback}** fallbacks.`
        );
    }
}

export default BroadcastCommand;
