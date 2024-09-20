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
import StringArgument from "@framework/arguments/StringArgument";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import DirectiveParsingService from "@main/services/DirectiveParsingService";
import SnippetManagerService from "@main/services/SnippetManagerService";

type SnippetCreateCommandArgs = {
    name: string;
    content: string;
};

@ArgumentSchema.Definition({
    names: ["name"],
    types: [StringArgument],
    optional: false,
    rules: [
        {
            "range:max": 100
        }
    ],
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide a name for the snippet.",
            [ErrorType.InvalidRange]:
                "The name of the snippet must be between 1 and 100 characters."
        }
    ]
})
@ArgumentSchema.Definition({
    names: ["content"],
    types: [RestStringArgument],
    optional: false,
    rules: [
        {
            "range:max": 4000
        }
    ],
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide the content of the snippet.",
            [ErrorType.InvalidRange]:
                "The content of the snippet must be between 1 and 4000 characters."
        }
    ]
})
class SnippetCreateCommand extends Command {
    public override readonly name = "snippet::create";
    public override readonly description: string = "Creates a new snippet.";
    public override readonly defer = true;
    public override readonly usage = ["<name: String> <...content: RestString>"];
    public override readonly aliases = ["snippet::add"];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.BanMembers
    ];
    public override readonly permissionCheckingMode = "or";

    @Inject()
    private readonly snippetManagerService!: SnippetManagerService;

    @Inject()
    private readonly directiveParsingService!: DirectiveParsingService;

    public override async execute(context: Context, args: SnippetCreateCommandArgs): Promise<void> {
        if (this.snippetManagerService.hasSnippet(args.name, context.guildId)) {
            await context.error(`Snippet \`${args.name}\` already exists.`);
            return;
        }

        try {
            await this.directiveParsingService.parse(args.content);
        } catch (error) {
            await context.error(
                `Invalid directive: ${error instanceof DirectiveParseError ? error.message : "Unknown reason"}`
            );

            return;
        }

        await this.snippetManagerService.createSnippet({
            name: args.name,
            content: args.content,
            guildId: context.guildId,
            userId: context.userId,
            attachmentURLs: context.attachments.map(attachment => attachment.proxyURL)
        });

        await context.success(`Snippet \`${args.name}\` has been created.`);
    }
}

export default SnippetCreateCommand;
