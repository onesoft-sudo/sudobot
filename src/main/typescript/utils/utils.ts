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

import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import type {
    Channel,
    GuildBasedChannel,
    GuildMember,
    PermissionOverwrites,
    PermissionResolvable,
    TextBasedChannel,
    TextChannel,
    ThreadChannel
} from "discord.js";
import { ChannelType, PermissionsBitField } from "discord.js";
import { mkdirSync } from "fs";
import path from "path";

export function isSnowflake(input: string) {
    return /^\d{16,22}$/.test(input);
}

export function pick<T, K extends Array<keyof T>>(
    object: T,
    keys: K
): Pick<T, K extends Array<infer E> ? E : never> {
    if (typeof object === "object" && object !== null) {
        const picked: Partial<T> = {};

        for (const key of keys) {
            picked[key] = object[key];
        }

        return picked as Pick<T, K extends Array<infer E> ? E : never>;
    }

    return {} as Pick<T, K extends Array<infer E> ? E : never>;
}

export function isTextBasedChannel(
    channel: GuildBasedChannel | Channel | ThreadChannel,
    DMs = false
): channel is Extract<GuildBasedChannel, { send: unknown }> {
    return (
        [
            ...(DMs ? [ChannelType.DM, ChannelType.GroupDM] : []),
            ChannelType.GuildAnnouncement,
            ChannelType.GuildText,
            ChannelType.PrivateThread,
            ChannelType.PublicThread,
            ChannelType.GuildVoice
        ].includes(channel.type) && "send" in channel
    );
}

export function developmentMode() {
    return (
        ["dev", "development"].includes(process.env.NODE_ENV?.toLowerCase() ?? "production") ||
        ["dev", "development"].includes(process.env.SUDO_ENV?.toLowerCase() ?? "production")
    );
}

export function wait(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function systemPrefix(pathLike: string, createDirIfNotExists = false) {
    const directoryOrFile = path.resolve(
        process.env.SUDO_PREFIX ?? __dirname,
        process.env.SUDO_PREFIX ? "" : "../../../..",
        __filename.endsWith(".ts") ? "" : "..",
        pathLike
    );

    if (createDirIfNotExists) mkdirSync(directoryOrFile, { recursive: true });

    return directoryOrFile;
}

export function getPermissionNames(permissionsBit: bigint) {
    const result = [];
    const permissions = new PermissionsBitField(permissionsBit);

    for (const permission of Object.keys(
        PermissionsBitField.Flags
    ) as (keyof typeof PermissionsBitField.Flags)[]) {
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

export function getChannelPermissionOverride(
    permission: PermissionResolvable,
    permissionOverwrites: PermissionOverwrites
) {
    return permissionOverwrites.allow.has(permission, true)
        ? true
        : permissionOverwrites.deny.has(permission, true)
          ? true
          : null;
}

export function chunkedString(str: string, chunkSize = 4000) {
    const output = [];
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

export function safeMessageContent(
    content: string,
    member: GuildMember,
    channel?: TextBasedChannel
) {
    return member.permissions.has("MentionEveryone") &&
        (!channel || member.permissionsIn(channel as TextChannel).has("MentionEveryone"))
        ? content
        : content
              .replaceAll(/@everyone/gi, "`@everyone`")
              .replaceAll(/@here/gi, "`@here`")
              .replaceAll(`<@&${member.guild.id}>`, "`@everyone`")
              .replace(
                  /<@&(\d+)>/gim,
                  (_, id) => `@${member.guild.roles.cache.get(id)?.name ?? id}`
              );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function assertUnreachable(_value: never): never {
    throw new Error("This statement should be unreachable");
}

export function TODO(message?: string): never {
    throw new Error(message ?? "Not implemented");
}

export async function request<D = unknown>(options: AxiosRequestConfig<D>) {
    try {
        return [await axios(options), null] as const;
    } catch (error) {
        return [null, error] as const;
    }
}
