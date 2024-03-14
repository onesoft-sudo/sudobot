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

import { ChannelType, GuildMember, Message, MessageType } from "discord.js";
import { log, logError } from "../../components/log/Logger";
import Client from "../../core/Client";
import EventListener from "../../core/EventListener";
import { Events } from "../../types/ClientEvents";

export default class MessageCreateEvent extends EventListener<Events.MessageCreate> {
    public readonly name = Events.MessageCreate;
    public readonly types = [MessageType.Default, MessageType.Reply];
    public readonly listeners = [
        (message: Message) => this.client.messageFilter.onMessageCreate(message),
        (message: Message) => this.client.messageRuleService.onMessageCreate(message),
        (message: Message) => this.client.fileFilter.onMessageCreate(message),
        (message: Message) => this.client.aiAutoMod.onMessageCreate(message)
    ];

    constructor(protected client: Client) {
        super(client);
    }

    async execute(message: Message) {
        /**
         * For performance reasons, ignore bots completely.
         */
        if (message.author.bot) return;

        if (!this.types.includes(message.type)) return;
        if (message.channel.type === ChannelType.DM) return;

        let member = message.member as GuildMember;

        if (!("has" in (member.permissions as GuildMember["permissions"]))) {
            try {
                member = await message.guild!.members.fetch(member.user.id);

                if (!member) {
                    throw new Error("Invalid member");
                }

                (message.member as GuildMember) = member;
            } catch (e) {
                logError(e);
            }
        }

        this.client.emit(Events.NormalMessageCreate, message);

        for (const listener of this.listeners) {
            if (await listener(message)) {
                return;
            }
        }

        await this.client.antispam.onMessageCreate(message).catch(logError);
        this.client.statsService.onMessageCreate(message);
        this.client.triggerService.onMessageCreate(message);

        const value = await this.client.commandManager
            .runCommandFromMessage(message)
            .catch(logError);

        if (value === false) {
            log("Command or snippet not found: all strategies failed");
        }
    }
}
