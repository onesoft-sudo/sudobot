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

import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { fetchUser } from "@framework/utils/entities";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { isTextBasedChannel } from "@main/utils/utils";
import { Message, MessageType, User, time } from "discord.js";

@Name("bumpReminderService")
class BumpReminderService extends Service {
    private static readonly DISBOARD_BOT_ID = process.env.DISBOARD_BOT_ID ?? "302050872383242240";

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    public async replacePlaceholders(
        content: string,
        {
            remindAfter = 0,
            user,
            userId
        }: {
            user?: User;
            userId?: string;
            remindAfter?: number;
        }
    ) {
        if (!userId && !user) {
            throw new Error("Both user and userId are undefined");
        }

        if (/:username:/.test(content) && !user) {
            user = (await fetchUser(this.client, userId!)) ?? undefined;
        }

        return content
            .replace(/:username:/g, user?.username ?? "Unknown")
            .replace(/:mention:/g, `<@${userId}>`)
            .replace(/:id:/g, userId ?? "0")
            .replace(/:time:/g, time(new Date(Date.now() + remindAfter), "R"));
    }

    @GatewayEventListener("messageCreate")
    public async onMessageCreate(message: Message<boolean>) {
        if (
            message.author.id !== BumpReminderService.DISBOARD_BOT_ID ||
            message.type !== MessageType.ChatInputCommand ||
            !message.embeds[0]?.description?.includes("Bump done!")
        ) {
            return;
        }

        const config = this.configManager.config[message.guildId!]?.bump_reminder;
        const {
            disabled_channels,
            remind_after: remindAfter = 0,
            enabled,
            on_bump_content
        } = config ?? {};

        if (
            !enabled ||
            disabled_channels?.includes(message.channelId!) ||
            !message.interactionMetadata?.user ||
            !isTextBasedChannel(message.channel)
        ) {
            return;
        }

        await message.channel.send(
            await this.replacePlaceholders(
                on_bump_content ??
                    ":mention:\nThanks for bumping the server! We'll remind you again :time:.",
                {
                    remindAfter,
                    user: message.interaction!.user
                }
            )
        );
    }
}

export default BumpReminderService;
