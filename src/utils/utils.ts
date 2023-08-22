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
    APIEmbedField,
    Channel,
    ChannelType,
    ColorResolvable,
    EmbedBuilder,
    GuildMember,
    NewsChannel,
    PermissionOverwrites,
    PermissionResolvable,
    PermissionsBitField,
    TextChannel,
    ThreadChannel,
    User,
    escapeMarkdown
} from "discord.js";
import { mkdirSync } from "fs";
import path from "path";
import Client from "../core/Client";
import { ActionDoneName } from "../services/InfractionManager";

export function isSnowflake(input: string) {
    return /^\d{16,22}$/.test(input);
}

export interface CreateModerationEmbedOptions {
    user: User;
    actionDoneName?: ActionDoneName;
    reason?: string;
    description?: string;
    fields?:
        | APIEmbedField[]
        | ((fields: APIEmbedField[], id: string, reason?: string) => Promise<APIEmbedField[]> | APIEmbedField[]);
    id: string | number;
    color?: ColorResolvable;
}

export async function createModerationEmbed({
    user,
    actionDoneName,
    reason,
    description,
    fields,
    id,
    color = 0xf14a60
}: CreateModerationEmbedOptions) {
    return new EmbedBuilder({
        author: {
            name: user.tag,
            icon_url: user.displayAvatarURL()
        },
        description: description ?? `**${escapeMarkdown(user.tag)}** has been ${actionDoneName}.`,
        fields:
            typeof fields === "function"
                ? await fields(
                      [
                          {
                              name: "Reason",
                              value: reason ?? "*No reason provided*"
                          },
                          {
                              name: "Infraction ID",
                              value: `${id}`
                          }
                      ],
                      `${id}`,
                      reason
                  )
                : [
                      {
                          name: "Reason",
                          value: reason ?? "*No reason provided*"
                      },
                      ...(fields ?? []),
                      {
                          name: "Infraction ID",
                          value: `${id}`
                      }
                  ],
        footer: actionDoneName
            ? {
                  text: actionDoneName[0].toUpperCase() + actionDoneName.substring(1)
              }
            : undefined
    })
        .setTimestamp()
        .setColor(color);
}

export function getEmoji(client: Client, name: string) {
    return (
        client.configManager.systemConfig.emojis?.[name] ??
        client.emojiMap.get(name)?.toString() ??
        client.emojis.cache.find(e => e.name === name)?.toString() ??
        ""
    );
}

export function isTextableChannel(
    channel: Channel | ThreadChannel,
    DMs = false
): channel is TextChannel | NewsChannel | ThreadChannel {
    return [
        ...(DMs ? [ChannelType.DM, ChannelType.GroupDM] : []),
        ChannelType.GuildAnnouncement,
        ChannelType.GuildText,
        ChannelType.PrivateThread,
        ChannelType.PublicThread
    ].includes(channel.type);
}

export function developmentMode() {
    return (
        ["dev", "development"].includes(process.env.NODE_ENV?.toLowerCase()!) ||
        ["dev", "development"].includes(process.env.SUDO_ENV?.toLowerCase()!)
    );
}

export function isImmuneToAutoMod(
    client: Client,
    member: GuildMember,
    permission?: PermissionResolvable[] | PermissionResolvable
) {
    return client.permissionManager.isImmuneToAutoMod(member, permission);
}

export function wait(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function sudoPrefix(pathLike: string, createDirIfNotExists = false) {
    const directoryOrFile = path.resolve(process.env.SUDO_PREFIX ?? __dirname, process.env.SUDO_PREFIX ? "" : "../..", pathLike);

    if (createDirIfNotExists) mkdirSync(directoryOrFile, { recursive: true });

    return directoryOrFile;
}

export function getPermissionNames(permissionsBit: bigint) {
    const result = [];
    const permissions = new PermissionsBitField(permissionsBit);

    for (const permission of Object.keys(PermissionsBitField.Flags) as (keyof typeof PermissionsBitField.Flags)[]) {
        if (permissions.has(PermissionsBitField.Flags[permission])) {
            result.push(permission);
        }
    }

    return result;
}

export function forceGetPermissionNames(permissions: PermissionResolvable[]) {
    const strings: string[] = [];

    for (const permission of permissions) {
        if (typeof permission === "bigint") {
            strings.push(...getPermissionNames(permission));
        } else if (typeof permission === "string") {
            strings.push(permission);
        } else throw new Error("Unknown permission type");
    }

    return strings;
}

export function getChannelPermissionOverride(permission: PermissionResolvable, permissionOverwrites: PermissionOverwrites) {
    return permissionOverwrites.allow.has(permission, true)
        ? true
        : permissionOverwrites.deny.has(permission, true)
        ? true
        : null;
}

export function chunkedString(str: string, chunkSize = 4000) {
    let output = [];
    let chunk = "";

    for (let i = 0; i < str.length; i++) {
        if (i !== 0 && i % chunkSize === 0) {
            output.push(chunk);
            chunk = str[i];
            continue;
        }

        chunk += str[i];
    }

    if (chunk.length !== 0) {
        output.push(chunk);
    }

    return output;
}

export function escapeRegex(string: string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
}
