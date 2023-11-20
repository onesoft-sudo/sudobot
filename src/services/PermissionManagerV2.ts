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

import { PermissionOverwrite } from "@prisma/client";
import { Awaitable, GuildMember, PermissionsString, Role, Snowflake } from "discord.js";
import type Client from "../core/Client";
import Service from "../core/Service";
import LevelBasedPermissionManager from "../utils/LevelBasedPermissionManager";
import { logInfo } from "../utils/logger";
import { GuildConfig } from "./ConfigManager";

export const name = "permissionManagerV2";

export type GetMemberPermissionInGuildResult = {
    permissions: PermissionsString[];
} & (
    | {
          type: "levels";
          level: number;
      }
    | {
          type: "discord";
      }
    | {
          type: "layered";
          highestOverwrite?: PermissionOverwrite;
          highestRoleHavingOverwrite?: Role;
      }
);

export abstract class AbstractPermissionManager {
    protected hasSyncedInitially = false;

    constructor(protected readonly client: Client) {}

    triggerSyncIfNeeded() {
        if (!this.hasSyncedInitially) {
            this.hasSyncedInitially = true;
            return this.sync();
        }

        return null;
    }

    abstract sync(): Awaitable<void>;
    abstract getMemberPermissions(member: GuildMember): GetMemberPermissionInGuildResult;
}

export default class PermissionManagerV2<M extends AbstractPermissionManager = AbstractPermissionManager> extends Service {
    protected readonly cache: Record<`${Snowflake}_${Snowflake}`, object> = {};
    protected readonly managers: Record<NonNullable<GuildConfig["permissions"]["mode"]>, AbstractPermissionManager | undefined> =
        {
            layered: null as unknown as AbstractPermissionManager,
            discord: null as unknown as AbstractPermissionManager,
            levels: new LevelBasedPermissionManager(this.client)
        };

    constructor(client: Client) {
        super(client);

        if (!this.client.configManager.systemConfig.sync_permission_managers_on_boot) {
            return;
        }

        for (const managerName in this.managers) {
            this.managers[managerName as keyof typeof this.managers]?.sync();
            logInfo(`[${this.constructor.name}] Synchronizing ${managerName} permission manager`);
        }
    }

    protected getMode(guildId: string) {
        return this.client.configManager.config[guildId]?.permissions.mode ?? "discord";
    }

    async getManager(guildId: string): Promise<M> {
        const manager = this.managers[this.getMode(guildId)];

        if (!manager) {
            throw new Error("Unknown/Unsupported permission mode: " + this.getMode(guildId));
        }

        await manager.triggerSyncIfNeeded();
        return manager as M;
    }

    async getMemberPermissionsInGuild(member: GuildMember) {
        return (await this.getManager(member.guild.id)).getMemberPermissions(member);
    }

    usesLayeredMode(guildId: string) {
        return this.getMode(guildId) === "layered";
    }

    usesLevelBasedMode(guildId: string): this is PermissionManagerV2<LevelBasedPermissionManager> {
        return this.getMode(guildId) === "levels";
    }

    usesDiscordMode(guildId: string) {
        return this.getMode(guildId) === "discord";
    }
}
