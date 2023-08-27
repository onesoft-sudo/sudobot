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

import { ChannelType, EmbedBuilder, Message, PartialMessage, PermissionsBitField } from "discord.js";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";

export default class SnipeCommand extends Command implements HasEventListeners {
    public readonly name = "snipe";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    protected lastDeletedMessages = new Map<Snowflake, Message<boolean> | PartialMessage | undefined>();

    public readonly description = "Reposts the last deleted message.";

    @GatewayEventListener("messageDelete")
    onMessageDelete(message: Message<boolean> | PartialMessage) {
        if (!message.content || message.channel.type === ChannelType.DM) {
            return;
        }

        this.lastDeletedMessages.set(message.guildId!, message);
    }

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const lastDeletedMessage = this.lastDeletedMessages.get(message.guildId!);

        if (!lastDeletedMessage) {
            await this.error(message, `No deleted message was recorded yet.`);
            return;
        }

        return {
            __reply: true,
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: lastDeletedMessage.author?.username ?? "Unknown",
                        iconURL: lastDeletedMessage.author?.displayAvatarURL()
                    },
                    color: Math.floor(Math.random() * 0xffffff),
                    description: lastDeletedMessage.content!,
                    footer: {
                        text: "Sniped"
                    }
                }).setTimestamp()
            ]
        };
    }
}
