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

import { ChannelType, ClientEvents, GuildMember, Message, MessageType } from "discord.js";
import Client from "../../core/Client";
import Event from "../../core/Event";
import { log, logError } from "../../utils/logger";

export default class MessageCreateEvent extends Event {
    public name: keyof ClientEvents = "messageCreate";

    public types = [MessageType.Default, MessageType.Reply];

    constructor(protected client: Client) {
        super(client);
    }

    async execute(message: Message) {
        if (message.author.bot) return;

        if (!this.types.includes(message.type)) return;

        if (message.channel.type === ChannelType.DM) return;

        let member: GuildMember = <any>message.member!;

        if (!(member.permissions as any)?.has) {
            try {
                member = await message.guild!.members.fetch(member.user.id);

                if (!member) {
                    throw new Error("Invalid member");
                }

                (message.member as any) = member;
            } catch (e) {
                logError(e);
            }
        }

        let deleted = await this.client.messageFilter.onMessageCreate(message).catch(logError);

        if (deleted) return;

        deleted = await this.client.messageRuleService.onMessageCreate(message).catch(logError);

        if (deleted) return;

        deleted = await this.client.fileFilter.onMessageCreate(message).catch(logError);

        if (deleted) return;

        await this.client.antispam.onMessageCreate(message).catch(logError);
        this.client.triggerService.onMessageCreate(message);

        const value = await this.client.commandManager.runCommandFromMessage(message).catch(logError);

        if (value === false) {
            log("Command or snippet not found: all strategies failed");
        }
    }
}
