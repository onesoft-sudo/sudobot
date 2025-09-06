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

import Application from "@framework/app/Application";
import FluentSet from "@framework/collections/FluentSet";
import { Inject } from "@framework/container/Inject";
import { MemberPermissionData } from "@framework/contracts/PermissionManagerInterface";
import AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager";
import {
    AbstractPermissionManagerService,
    SystemPermissionResolvable
} from "@framework/permissions/AbstractPermissionManagerService";
import { Name } from "@framework/services/Name";
import { OptionalRecord } from "@framework/types/OptionalRecord";
import { Guild, GuildMember, Snowflake } from "discord.js";
import { PermissionMode } from "../schemas/GuildConfigSchema";
import DiscordPermissionManager from "../security/DiscordPermissionManager";
import LayeredPermissionManager from "../security/LayeredPermissionManager";
import LevelBasedPermissionManager from "../security/LevelBasedPermissionManager";
import ConfigurationManager from "./ConfigurationManager";

@Name("permissionManager")
class PermissionManagerService extends AbstractPermissionManagerService {
    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    public readonly managers: OptionalRecord<PermissionMode, AbstractPermissionManager> = {};

    public constructor(application: Application) {
        super(application);
        this.createManagers();
    }

    private createManagers() {
        const config = this.application.service("configManager").config;
        const modes = new FluentSet<PermissionMode>();

        for (const guildId in config) {
            const mode = config[guildId]?.permissions.mode;

            if (mode) {
                modes.add(mode);
            }
        }

        for (const mode of modes) {
            const manager = this.createManager(mode);
            void manager.boot?.();
            this.managers[mode] = manager;
        }
    }

    private createManager(mode: PermissionMode) {
        switch (mode) {
            case "layered":
                return new LayeredPermissionManager(this.application);

            case "discord":
                return new DiscordPermissionManager(this.application);

            case "levels":
                return new LevelBasedPermissionManager(this.application);

            default:
                throw new Error(`Unknown permission mode: ${mode as string}`);
        }
    }

    public getManagerForGuild(guildResolvable: Guild | Snowflake) {
        return this.getManager(typeof guildResolvable === "string" ? guildResolvable : guildResolvable.id);
    }

    public override async hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[],
        alreadyComputedPermissions?: MemberPermissionData
    ) {
        return (await this.getManager(member.guild.id)).hasPermissions(member, permissions, alreadyComputedPermissions);
    }

    public override async getMemberPermissions<T extends AbstractPermissionManager>(member: GuildMember) {
        return (await this.getManager(member.guild.id)).getMemberPermissions(member) as GenericAwaited<
            ReturnType<T["getMemberPermissions"]>
        >;
    }

    protected async getManager(guildId: string) {
        const mode = this.application.service("configManager").config[guildId]?.permissions?.mode ?? "discord";

        if (!this.managers[mode]) {
            this.managers[mode] = this.createManager(mode);
            await this.managers[mode].boot?.();
        }

        return this.managers[mode];
    }

    public async canAutoModerate(member: GuildMember) {
        const moderatorIsSystemAdmin = await this.isSystemAdmin(member);

        if (moderatorIsSystemAdmin) {
            return false;
        }

        if (member.guild.ownerId === member.id) {
            return false;
        }

        const { invincible } = this.configurationManager.config[member.guild.id]?.permissions ?? {};

        if (invincible?.users?.includes(member.id) || invincible?.roles?.some(role => member.roles.cache.has(role))) {
            return false;
        }

        const manager = await this.getManager(member.guild.id);
        return !(await manager.canBypassAutoModeration(member));
    }

    public async canModerate(member: GuildMember, moderator: GuildMember, forceNoSameMemberCheck?: boolean) {
        const moderatorIsSystemAdmin = await this.isSystemAdmin(moderator);

        if (member.id === moderator.id && !moderatorIsSystemAdmin && !forceNoSameMemberCheck) {
            return false;
        }

        if (moderatorIsSystemAdmin) {
            return true;
        }

        if (member.guild.ownerId === member.id) {
            return false;
        }

        if (member.guild.ownerId === moderator.id) {
            return true;
        }

        const { invincible, check_discord_permissions = "always" } =
            this.configurationManager.config[member.guild.id]?.permissions ?? {};

        if (invincible?.users?.includes(member.id) || invincible?.roles?.some(role => member.roles.cache.has(role))) {
            return false;
        }

        if (
            (check_discord_permissions === "during_manual_actions" || check_discord_permissions === "always") &&
            member.roles.highest.position >= moderator.roles.highest.position
        ) {
            return false;
        }

        const manager = await this.getManager(member.guild.id);

        if (!manager.canModerate) {
            return true;
        }

        return await manager.canModerate(member, moderator);
    }
}

type GenericAwaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

export default PermissionManagerService;
