/**
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

import { Colors, PermissionsBitField } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class TicketInitCommand extends Command {
    public readonly name = "ticketinit";
    public readonly validationRules: ValidationRule[] = [
        {
            name: "channel",
            types: [ArgumentType.Channel],
            optional: true,
            default: null,
            entity: {
                notNull: true
            },
            errors: {
                "entity:null": "You must specify a valid channel!"
            }
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageChannels];

    // FIXME
    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);
        const channel =
            (context.isLegacy ? context.parsedNamedArgs.channel : context.options.getChannel("channel")) ?? message.channel;

        if (!this.client.configManager.config[message.guildId!]!.tickets?.enabled) {
            await this.error(message, "Tickets are not enabled on this server!");
            return;
        }

        if (this.client.configManager.config[message.guildId!]!.tickets!.channels[channel.id]) {
            await this.error(message, "This channel is initialized in ticket service!");
            return;
        }

        this.client.configManager.config[message.guildId!]!.tickets!.channels ??= {};
        this.client.configManager.config[message.guildId!]!.tickets!.channels[channel.id] = {
            mode: "thread",
            title: "Create a ticket",
            description: "Press the button below to create a ticket!",
            color: Colors.Blurple,
            initial_message: "Hello! Please describe your issue here and a staff member will be with you shortly!",
            thread_channel: channel.id
        };
        
        await this.client.configManager.write();
        await this.client.ticketService.sendCreateTicketMessage(channel);
        await this.success(message, "Ticket system initialized!");
    }
}
