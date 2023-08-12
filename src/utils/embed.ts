/*
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

import { Channel, ChannelType, ColorResolvable, EmbedBuilder, Message, User, resolveColor } from "discord.js";
import { ChatInputCommandContext } from "../services/CommandManager";

export function generateEmbed(options: ChatInputCommandContext["options"]) {
    const getString = (field: string): string | undefined => {
        return options.getString(field) ?? undefined;
    };

    const author = {
        name: getString("author_name")!,
        iconURL: getString("author_iconurl")
    };

    const footer = {
        text: getString("footer_text")!,
        iconURL: getString("footer_iconurl")
    };

    if (
        getString("color") &&
        (!resolveColor(getString("color") as ColorResolvable) || isNaN(resolveColor(getString("color") as ColorResolvable)))
    ) {
        return { error: "Invalid color given." };
    }

    const embed = new EmbedBuilder({
        author: author.name ? author : undefined,
        title: getString("title"),
        description: getString("description"),
        thumbnail: getString("thumbnail")
            ? {
                  url: getString("thumbnail")!
              }
            : undefined,
        image: getString("image")
            ? {
                  url: getString("image")!
              }
            : undefined,
        video: getString("video")
            ? {
                  url: getString("video")!
              }
            : undefined,
        footer: footer.text ? footer : undefined,
        timestamp: getString("timestamp")
            ? getString("timestamp") === "current"
                ? new Date()
                : new Date(getString("timestamp")!)
            : undefined,
        fields: getString("fields")
            ? getString("fields")!
                  .trim()
                  .split(",")
                  .map(fieldData => {
                      const [name, value] = fieldData.trim().split(":");

                      return {
                          name: name.trim(),
                          value: value.trim()
                      };
                  })
            : [],
        url: getString("url")
    }).setColor((getString("color") ?? "#007bff") as ColorResolvable);

    return { embed };
}

export function userInfo(user: User) {
    return `ID: ${user.id}\nUsername: ${user.username}\nMention: ${user.toString()}`;
}

export function messageInfo(message: Message) {
    return `ID: ${message.id}\nURL: ${message.url}`;
}

export function channelInfo(channel: Channel) {
    return `ID: ${channel.id}\nType: ${ChannelType[channel.type]}\nMention: ${channel.toString()}`;
}
