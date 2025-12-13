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
