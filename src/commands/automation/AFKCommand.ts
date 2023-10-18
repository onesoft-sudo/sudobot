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

import {
    ChatInputCommandInteraction,
    GuildMember,
    Message,
    SlashCommandBuilder,
    User,
    escapeMarkdown,
    messageLink
} from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class AFKCommand extends Command {
    public readonly name = "afk";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.StringRest],
            name: "reason",
            optional: true,
            typeErrorMessage: "Please provide a usable/valid reason!"
        }
    ];
    public readonly permissions = [];
    public readonly aliases = ["gafk"];
    public readonly description = "Sets your AFK status, and tells others that you're away.";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option => option.setName("reason").setDescription("The reason of you being AFK"))
        .addBooleanOption(option => option.setName("global").setDescription("Globally set your AFK status. Defaults to false"));

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const { id } = (await this.deferIfInteraction(message, { fetchReply: true })) ?? {};

        const reason: string | undefined =
            (context.isLegacy ? context.parsedNamedArgs.reason : context.options.getString("reason")) ?? undefined;
        const global = (context.isLegacy ? context.argv[0] === "gafk" : context.options.getBoolean("global")) ?? false;

        if (message instanceof ChatInputCommandInteraction && reason) {
            const newMessage = {
                ...message,
                id,
                author: message.member!.user as User,
                member: message.member! as GuildMember,
                guild: message.guild!,
                deletable: true,
                url: messageLink(message.channelId!, id ?? "123", message.guildId!),
                delete: async () => {
                    console.log("Done");
                    await this.error(message, "Your AFK status is blocked by the message rules configured in the server.");
                },
                content: reason
            } as unknown as Message;

            let deleted: boolean | undefined = await this.client.messageRuleService.onMessageCreate(newMessage);

            console.log("Rules", deleted);

            if (deleted) {
                return;
            }

            deleted = await this.client.messageFilter.onMessageCreate(newMessage);
            console.log("Message Filter", deleted);

            if (deleted) {
                return;
            }
        }

        const isAFK = this.client.afkService.isAFK(message.guildId!, message.member!.user.id);

        if (isAFK && !!this.client.afkService.get(`global_${message.member!.user.id}`) !== global) {
            if (message instanceof ChatInputCommandInteraction) {
                await this.success(message, "Successfully removed your AFK status.");
            }

            return;
        }

        await this.client.afkService.startAFK(message.guildId!, message.member!.user.id, reason, global);

        await this.deferredReply(message, {
            embeds: [
                {
                    color: 0x007bff,
                    description: `You're${global ? " globally" : ""} AFK now${
                        reason ? `, for reason: **${escapeMarkdown(reason)}**` : ""
                    }.`
                }
            ],
            allowedMentions: {
                users: [],
                repliedUser: true,
                roles: []
            }
        });
    }
}
