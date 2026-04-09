/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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

import { it, describe, vi } from "vitest";
import LeveledPermissionManager from "@main/security/LeveledPermissionManager";
import type { PermissionLevel } from "@main/models/PermissionLevel";
import Application from "@main/core/Application";
import { Collection, PermissionFlagsBits } from "discord.js";
import { createClient, createMember } from "@tests/mocks/discord";

function createManager(data: unknown) {
    const app = new Application({ projectRootDirectoryPath: "", rootDirectoryPath: "", version: "1.0.0" });

    Object.defineProperty(app.database, "drizzle", {
        value: {
            query: {
                permissionLevels: {
                    findMany: vi.fn(() => data)
                }
            }
        }
    });

    return new LeveledPermissionManager(app, [], null);
}

describe("LeveledPermissionManager", () => {
    it("can do basic permission calculation", async ({ expect }) => {
        const manager = createManager(<PermissionLevel[]>[
            {
                id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                deniedDiscordPermissions: 0n,
                deniedSystemPermissions: [],
                disabled: false,
                grantedDiscordPermissions: PermissionFlagsBits.BanMembers,
                grantedSystemPermissions: [],
                guildId: "1",
                level: 10,
                roles: ["2"],
                users: ["3"]
            }
        ]);

        const client = createClient();
        const member = createMember(client, "3");

        Object.defineProperty(member, "permissions", { value: PermissionFlagsBits.SendMessages });
        Object.defineProperty(member, "guild", { value: { id: "1" } });
        Object.defineProperty(member, "roles", {
            value: {
                everyone: { id: "1" },
                cache: new Collection<string, unknown>([
                    ["2", { id: "2" }],
                    ["4", { id: "4" }]
                ])
            }
        });

        const permissions = await manager.getPermissions(member);
        expect(permissions.level).toBe(10);
        expect(permissions.customPermissions?.size).toBe(0);
        expect(permissions.discordPermissions).toBe(PermissionFlagsBits.SendMessages | PermissionFlagsBits.BanMembers);
        expect(permissions.grantAll).toBe(false);
    });
});
