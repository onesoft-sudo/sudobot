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
import Duration from "@framework/datetime/Duration";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type InfractionManager from "@main/services/InfractionManager";
import { GuildMember } from "discord.js";

@Name("antiMemberJoinService")
class AntiMemberJoinService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("infractionManager")
    private readonly infractionManager!: InfractionManager;

    public async onGuildMemberAdd(member: GuildMember) {
        const config = this.configManager.config[member.guild.id]?.anti_member_join;

        if (!config?.enabled) {
            return;
        }

        const { custom_reason, ignore_bots, behavior, ban_duration } = config;

        if (ignore_bots && member.user.bot) {
            return;
        }

        const reason =
            custom_reason ?? "Automatic: This server is not accepting new members at the moment.";

        if (behavior === "kick") {
            if (!member.kickable) {
                return;
            }

            await this.infractionManager.createKick({
                guildId: member.guild.id,
                member,
                reason,
                moderator: this.client.user!
            });
        } else if (behavior === "ban") {
            if (!member.bannable) {
                return;
            }

            await this.infractionManager.createBan({
                guildId: member.guild.id,
                user: member.user,
                reason,
                moderator: this.client.user!,
                duration: ban_duration ? Duration.fromMilliseconds(ban_duration) : undefined
            });
        }
    }
}

export default AntiMemberJoinService;
