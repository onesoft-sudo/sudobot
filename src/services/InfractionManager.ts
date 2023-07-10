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

import { formatDistanceToNowStrict } from "date-fns";
import { APIEmbedField, ColorResolvable, EmbedBuilder, EmbedField, Guild, GuildMember, User } from "discord.js";
import Service from "../core/Service";

export type CommonOptions = {
    reason?: string;
    guild: Guild;
    moderator: User;
    notifyUser?: boolean;
    sendLog?: boolean;
};

export type CreateUserBanOptions = CommonOptions & {
    deleteMessageSeconds?: number;
};

export type CreateMemberMuteOptions = CommonOptions & {
    duration?: number;
};

export type ActionDoneName = "banned" | "muted" | "kicked" | "warned";

export type SendDMOptions = {
    fields?: APIEmbedField[] | ((internalFields: APIEmbedField[]) => Promise<APIEmbedField[]> | APIEmbedField[]);
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

    async createUserBan(user: User, { guild, moderator, reason, deleteMessageSeconds, notifyUser }: CreateUserBanOptions) {
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: "BAN",
                userId: user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
                metadata: {
                    deleteMessageSeconds
                },
            }
        });

        this.client.logger.logUserBan({
            moderator,
            guild,
            id: `${id}`,
            user,
            deleteMessageSeconds,
            reason
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

    async createMemberKick(member: GuildMember, { guild, moderator, reason, notifyUser }: CommonOptions) {
        if (!member.kickable)
            return null;

        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: "KICK",
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
            }
        });

        this.client.logger.logMemberKick({
            moderator,
            guild,
            id: `${id}`,
            member,
            reason,
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

    async createMemberWarn(member: GuildMember, { guild, moderator, reason, notifyUser }: CommonOptions) {
        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: "WARNING",
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
            }
        });

        this.client.logger.logMemberWarning({
            moderator,
            member,
            guild,
            id: `${id}`,
            reason
        });

        let result = false;

        if (notifyUser) {
            result = await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "warned",
                reason,
            });
        }

        return { id, result };
    }

    async createMemberMute(member: GuildMember, { guild, moderator, reason, notifyUser, duration }: CreateMemberMuteOptions) {
        const mutedRole = this.client.configManager.config[guild.id]?.muting?.role;

        if (!mutedRole) {
            return { error: "Muted role is not configured, please set the muted role to use this command" };
        }

        try {
            await member.roles.add(mutedRole);
        }
        catch (e) {
            console.log(e);
            return { error: "Failed to assign the muted role to this user. Make sure that I have enough permissions to do it." };
        }

        const { id } = await this.client.prisma.infraction.create({
            data: {
                type: "MUTE",
                userId: member.user.id,
                guildId: guild.id,
                reason,
                moderatorId: moderator.id,
                expiresAt: duration ? new Date(Date.now() + duration) : undefined
            }
        });

        this.client.logger.logMemberMute({
            moderator,
            member,
            guild,
            id: `${id}`,
            duration,
            reason
        });

        let result = !notifyUser;

        if (notifyUser) {
            result = await this.sendDM(member.user, guild, {
                id,
                actionDoneName: "muted",
                reason,
                fields: [
                    {
                        name: "Duration",
                        value: `${duration ? formatDistanceToNowStrict(new Date(Date.now() - duration)) : "*No duration set*"}`
                    }
                ]
            });
        }

        return { id, result };
    }
}