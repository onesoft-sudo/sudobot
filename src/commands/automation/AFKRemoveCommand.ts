/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { EmbedBuilder, PermissionsBitField, User } from "discord.js";
import Command, {
    ArgumentType,
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";
import { isSystemAdmin } from "../../utils/utils";
import { AFKsCommandScope } from "./AFKsCommand";

export default class AFKRemoveCommand extends Command {
    public readonly name = "afks__remove";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            entity: {
                notNull: false
            },
            errors: {
                required: "Please provide a user to remove their AFK!",
                "type:invalid": "Please provide a valid user!",
                "entity:null": "Please provide a valid user!"
            }
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers];
    public readonly description = "Removes AFK status for a user.";
    public readonly availableOptions = {
        "-s, --scope=[everywhere|guild|global]":
            "Change the scope of this removal [System Admin Only]"
    };
    public readonly aliases = ["afks__delete"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const optionIndex = context.isLegacy
            ? context.args.findIndex(value => value === "-s" || value === "--scope")
            : -1;

        if (context.isLegacy && optionIndex !== -1 && !context.args[optionIndex + 1]) {
            await this.error(
                message,
                `Option \`${context.args[optionIndex]}\` requires an argument with one of the following values: \`everywhere\`, \`global\`, \`guild\`.`
            );
            return;
        }

        const scope =
            <AFKsCommandScope | null>(
                (context.isLegacy
                    ? optionIndex === -1
                        ? null
                        : context.args[optionIndex + 1]
                    : context.options.getString("scope"))
            ) ?? "guild";

        if (scope !== "guild" && !isSystemAdmin(this.client, message.member?.user.id as string)) {
            await this.error(message, `Only system admins can remove ${scope}-scoped AFK entries.`);
            return;
        }

        const user: User = context.isLegacy
            ? context.parsedNamedArgs.user
            : context.options.getString("user", true);
        const result: [guild: boolean, global: boolean] = [false, false];
        let mentions = 0;

        if (scope === "everywhere" || scope === "guild") {
            const entry = await this.client.afkService.removeAFK(
                message.guildId!,
                user.id,
                true,
                true
            );
            result[0] = !!entry;
            mentions += entry?.mentions.length ?? 0;
        }

        if (scope === "everywhere" || scope === "global") {
            const entry = await this.client.afkService.removeAFK("global", user.id, true, true);
            result[1] = !!entry;
            mentions += entry?.mentions.length ?? 0;
        }

        if (!result[0] && !result[1]) {
            await this.error(message, "That user is not AFK in the given scope.");
            return;
        }

        await this.deferredReply(message, {
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: user.username,
                        icon_url: user.displayAvatarURL()
                    },
                    color: 0x007bff,
                    description: `Successfully removed AFK status for this user. They had **${mentions}** mentions total in the given scope.`,
                    fields: [
                        {
                            name: "Scope",
                            value: `${scope[0].toUpperCase()}${scope.substring(1)}`
                        }
                    ],
                    footer: {
                        text: "Removed"
                    }
                }).setTimestamp()
            ]
        });
    }
}
