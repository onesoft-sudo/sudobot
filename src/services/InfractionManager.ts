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

import { ColorResolvable, EmbedBuilder, EmbedField, Guild, GuildMember, User } from "discord.js";
import Service from "../core/Service";

export type CommonOptions = {
    reason?: string;
    guild: Guild;
    moderatorId: string;
    notifyUser?: boolean;
    sendLog?: boolean;
};

export type CreateUserBanOptions = CommonOptions & {
    deleteMessageSeconds?: number;
};

export type ActionDoneName = "banned" | "muted" | "kicked";

export type SendDMOptions = {
    fields?: EmbedField[] | ((internalFields: EmbedField[]) => Promise<EmbedField[]> | EmbedField[]);
    description?: string;
    actionDoneName: ActionDoneName;
    id: string | number;
    reason?: string;
    color?: ColorResolvable;
};

export const name = "infractionManager";

export default class InfractionManager extends Service {
    private async sendDM(user: User, guild: Guild, { fields, description, actionDoneName, id, reason, color }: SendDMOptions) {
        console.log(this.client.configManager.config[guild.id]);

        const internalFields: EmbedField[] = [
            ...(this.client.configManager.config[guild.id]!.infractions?.send_ids_to_user ? [
                {
                    name: "Infraction ID",
                    value: `${id}`,
                    inline: false,
                }
            ] : [])
        ];

        try {
            await user.send({
                embeds: [
                    new EmbedBuilder({
                        author: {
                            name: `You have been ${actionDoneName} in ${guild.name}`,
                            iconURL: guild.iconURL() ?? undefined
                        },
                        description,
                        fields: [
                            {
                                name: "Reason",
                                value: reason ?? '*No reason provided*'
                            },
                            ...(fields ? (typeof fields === 'function' ? await fields(internalFields) : fields) : []),
                            ...(typeof fields === 'function' ? [] : internalFields ?? []),
                        ]
                    })
                        .setTimestamp()
                        .setColor(color ?? 0x0f14a60)
                ]
            });

            return true;
        }
        catch (e) {
            console.log(e);
            return false;
        }
    }

    async createUserBan(user: User, { guild, moderatorId, reason, deleteMessageSeconds, notifyUser }: CreateUserBanOptions) {
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: "BAN",
                userId: user.id,
                guildId: guild.id,
                reason,
                moderatorId,
                metadata: {
                    deleteMessageSeconds
                },
            }
        });

        if (notifyUser) {
            await this.sendDM(user, guild, {
                id,
                actionDoneName: "banned",
                reason,
            });
        }

        try {
            await guild.bans.create(user, {
                reason,
                deleteMessageSeconds
            });

            return id;
        }
        catch (e) {
            console.log(e);
            return null;
        }
    }

    async createMemberKick(member: GuildMember, { guild, moderatorId, reason, notifyUser }: CommonOptions) {
        if (!member.kickable)
            return null;

        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: "KICK",
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId,
            }
        });

        if (notifyUser) {
            await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "kicked",
                reason,
            });
        }

        try {
            await member.kick(reason);
            return id;
        }
        catch (e) {
            console.log(e);
            return null;
        }
    }
}