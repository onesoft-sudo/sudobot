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

import { APIEmbedField, Channel, ChannelType, ColorResolvable, EmbedBuilder, NewsChannel, TextChannel, ThreadChannel, User, escapeMarkdown } from "discord.js";
import Client from "../core/Client";
import { ActionDoneName } from "../services/InfractionManager";

export function isSnowflake(input: string) {
    return /^\d{16,22}$/.test(input);
}

export function stringToTimeInterval(input: string) {
    let seconds = 0;
    let number = '';

    for (let i = 0; i < input.length; i++) {
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].includes(input[i])) {
            number += input[i];
        }
        else {
            const unit = input[i];
            const float = parseFloat(number);

            if (isNaN(float)) {
                return { error: "Invalid numeric time value", seconds: NaN };
            }

            if (unit === 's') {
                seconds += float;
            }
            else if (unit === 'm') {
                seconds += float * 60;
            }
            else if (unit === 'h') {
                seconds += float * 60 * 60;
            }
            else if (unit === 'd') {
                seconds += float * 60 * 60 * 24;
            }
            else if (unit === 'w') {
                seconds += float * 60 * 60 * 24 * 7;
            }
            else if (unit === 'M') {
                seconds += float * 60 * 60 * 24 * 30;
            }
            else if (unit === 'y') {
                seconds += float * 60 * 60 * 24 * 365;
            }
            else {
                return { error: "Invalid time unit", seconds: NaN };
            }

            number = '';
        }
    }

    return { error: undefined, seconds };
}

export interface CreateModerationEmbedOptions {
    user: User;
    actionDoneName: ActionDoneName;
    reason?: string;
    description?: string;
    fields?: APIEmbedField[] | ((fields: APIEmbedField[], id: string, reason?: string) => Promise<APIEmbedField[]> | APIEmbedField[]);
    id: string | number;
    color?: ColorResolvable;
}

export async function createModerationEmbed({ user, actionDoneName, reason, description, fields, id, color = 0xf14a60 }: CreateModerationEmbedOptions) {
    return new EmbedBuilder({
        author: {
            name: user.tag,
            icon_url: user.displayAvatarURL()
        },
        description: description ?? `**${escapeMarkdown(user.tag)}** has been ${actionDoneName}.`,
        fields: (typeof fields === 'function' ? (
            await fields([
                {
                    name: 'Reason',
                    value: reason ?? '*No reason provided*'
                },
                {
                    name: "Infraction ID",
                    value: `${id}`
                }
            ], `${id}`, reason)
        ) : (
            [
                {
                    name: 'Reason',
                    value: reason ?? '*No reason provided*'
                },
                ...(fields ?? []),
                {
                    name: "Infraction ID",
                    value: `${id}`
                }
            ]
        )),
        footer: {
            text: actionDoneName[0].toUpperCase() + actionDoneName.substring(1)
        },
    })
        .setTimestamp()
        .setColor(color)
}

export function getEmoji(client: Client, name: string) {
    return client.configManager.systemConfig.emojis?.[name] ?? '';
}

export function isTextableChannel(channel: Channel | ThreadChannel, DMs = false): channel is (TextChannel | NewsChannel | ThreadChannel) {
    return [
        ...(DMs ? [
            ChannelType.DM,
            ChannelType.GroupDM
        ] : []),
        ChannelType.GuildAnnouncement,
        ChannelType.GuildText,
        ChannelType.PrivateThread,
        ChannelType.PublicThread,
    ].includes(channel.type);
}

export function developmentMode() {
    return process.env.NODE_ENV !== "production" && process.env.SUDO_ENV !== "production";
}
