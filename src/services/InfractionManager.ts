/*
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

import { Infraction, InfractionType } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import { APIEmbed, Colors, Snowflake, User } from "discord.js";
import CommandAbortedError from "../framework/commands/CommandAbortedError";
import { Name } from "../framework/services/Name";
import { Service } from "../framework/services/Service";
import { emoji } from "../framework/utils/emoji";
import ConfigurationManager from "./ConfigurationManager";

@Name("infractionManager")
class InfractionManager extends Service {
    private readonly actionDoneNames: Record<InfractionType, string> = {
        [InfractionType.BEAN]: "beaned",
        [InfractionType.MASSKICK]: "kicked",
        [InfractionType.KICK]: "kicked",
        [InfractionType.MUTE]: "muted",
        [InfractionType.SOFTBAN]: "softbanned",
        [InfractionType.WARNING]: "warned",
        [InfractionType.MASSBAN]: "banned",
        [InfractionType.BAN]: "banned",
        [InfractionType.UNBAN]: "unbanned",
        [InfractionType.UNMUTE]: "unmuted",
        [InfractionType.BULK_DELETE_MESSAGE]: "bulk deleted messages",
        [InfractionType.TEMPBAN]: "temporarily banned",
        [InfractionType.NOTE]: "noted",
        [InfractionType.TIMEOUT]: "timed out",
        [InfractionType.TIMEOUT_REMOVE]: "removed timeout"
    };

    public processReason(guildId: Snowflake, reason: string | undefined, abortOnNotFound = true) {
        if (!reason?.length) {
            return null;
        }

        let finalReason = reason;
        const configManager = this.application.getService(ConfigurationManager);
        const templates = configManager.config[guildId]?.infractions?.reason_templates ?? {};
        const templateWrapper =
            configManager.config[guildId]?.infractions?.reason_template_placeholder_wrapper ??
            "{{%name%}}";

        for (const key in templates) {
            const placeholder = templateWrapper.replace("%name%", `( *)${key}( *)`);
            finalReason = finalReason.replace(new RegExp(placeholder, "gi"), templates[key]);
        }

        if (abortOnNotFound) {
            const matches = [...finalReason.matchAll(/\{\{[A-Za-z0-9_-]+\}\}/gi)];

            if (matches.length > 0) {
                const abortReason = `${emoji(
                    this.application.getClient(),
                    "error"
                )} The following placeholders were not found in the reason: \`${matches
                    .map(m => m[0])
                    .join("`, `")}\`
                        `;

                throw new CommandAbortedError(abortReason);
            }
        }

        return finalReason;
    }

    private async notify(user: User, infraction: Infraction) {
        const guild = this.application.getClient().guilds.cache.get(infraction.guildId);

        if (!guild) {
            return false;
        }

        const embed = {
            author: {
                name: `You've been ${this.actionDoneNames[infraction.type]} in ${guild.name}`,
                icon_url: guild.iconURL() ?? undefined
            },
            fields: [
                {
                    name: "Reason",
                    value: infraction.reason ?? "No reason provided"
                }
            ],
            color: Colors.Red,
            timestamp: new Date().toISOString()
        } satisfies APIEmbed;

        if (infraction.expiresAt) {
            embed.fields.push({
                name: "Duration",
                value: formatDistanceToNowStrict(infraction.expiresAt)
            });
        }

        try {
            await user.send({ embeds: [embed] });
            return true;
        } catch {
            return false;
        }
    }

    public async createBean({ moderator, user, reason, guildId }: CreateBeanPayload) {
        const infraction = await this.application.prisma.infraction.create({
            data: {
                userId: user.id,
                guildId,
                moderatorId: moderator.id,
                type: InfractionType.BEAN,
                reason: this.processReason(guildId, reason)
            }
        });

        await this.notify(user, infraction);
        this.application.getClient().emit("infractionCreate", infraction, user, moderator, false);
        return { infraction };
    }
}

type CommonOptions = {
    moderator: User;
    reason?: string;
    guildId: Snowflake;
};

type CreateBeanPayload = CommonOptions & {
    user: User;
};

export default InfractionManager;
