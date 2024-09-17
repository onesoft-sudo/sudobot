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

import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import type { HasEventListeners } from "@framework/types/HasEventListeners";
import {
    Collection,
    GuildMember,
    Snowflake,
    type Guild,
    type Invite,
    type ReadonlyCollection
} from "discord.js";

@Name("inviteTrackingService")
class InviteTrackingService extends Service implements HasEventListeners {
    private readonly _invites = new Collection<`${Snowflake}::${string}`, InviteInfo>();
    private readonly _uses = new Collection<`${Snowflake}::${string}`, number>();

    public get invites(): ReadonlyCollection<`${Snowflake}::${string}`, InviteInfo> {
        return this._invites;
    }

    public override async boot() {
        for (const guild of this.client.guilds.cache.values()) {
            const invites = await guild.invites.fetch();

            for (const invite of invites.values()) {
                this._invites.set(`${guild.id}::${invite.code}`, {
                    type: "general",
                    invite,
                    guildId: guild.id,
                    uses: invite.uses ?? 0
                });
            }

            if (guild.vanityURLCode) {
                this._invites.set(`${guild.id}::${guild.vanityURLCode}`, {
                    type: "vanity",
                    code: guild.vanityURLCode,
                    uses: guild.vanityURLUses ?? 0,
                    guildId: guild.id
                });
            }
        }

        this.application.logger.info(`Synchronized ${this._invites.size} invites`);
    }

    @GatewayEventListener("inviteCreate")
    public onInviteCreate(invite: Invite) {
        if (!invite.guild) {
            return;
        }

        if (invite.inviterId) {
            this._uses.set(`${invite.guild.id}::${invite.code}`, 0);
        }

        this._invites.set(`${invite.guild.id}::${invite.code}`, {
            type: "general",
            invite,
            guildId: invite.guild.id,
            uses: invite.uses ?? 0
        });
    }

    @GatewayEventListener("inviteDelete")
    public onInviteDelete(invite: Invite) {
        if (!invite.guild) {
            return;
        }

        this._invites.delete(`${invite.guild.id}::${invite.code}`);
        this._uses.delete(`${invite.guild.id}::${invite.code}`);
    }

    @GatewayEventListener("guildUpdate")
    public onGuildUpdate(oldGuild: Guild, newGuild: Guild) {
        if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
            if (oldGuild.vanityURLCode) {
                this._invites.delete(`${oldGuild.id}::${oldGuild.vanityURLCode}`);
            }

            if (newGuild.vanityURLCode) {
                this._invites.set(`${newGuild.id}::${newGuild.vanityURLCode}`, {
                    type: "vanity",
                    code: newGuild.vanityURLCode,
                    uses: newGuild.vanityURLUses ?? 0,
                    guildId: newGuild.id
                });
            }
        }
    }

    public async findInviteForMember(member: GuildMember) {
        const invites = await member.guild.invites.fetch();

        for (const invite of invites.values()) {
            const existingUses = this._uses.get(`${member.guild.id}::${invite.code}`);

            if (existingUses === undefined || invite.uses === null) {
                continue;
            }

            if (invite.uses > existingUses) {
                this._uses.set(`${member.guild.id}::${invite.code}`, invite.uses);
                return invite;
            }
        }

        return null;
    }
}

export type InviteInfo =
    | {
          type: "general";
          invite: Invite;
          guildId: string;
          uses: number;
      }
    | {
          type: "vanity";
          code: string;
          uses: number;
          guildId: string;
      };

export default InviteTrackingService;
