/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import { beforeEach, describe, it, vi } from "vitest";
import PolicyManagerAVC from "@framework/selinux/PolicyManagerAVC";
import type { PolicyModuleType } from "@framework/selinux/PolicyModuleSchema";
import { PermissionFlagsBits } from "discord.js";
import { createClient, createMember } from "@tests/mocks/discord";

const makePolicy = <T extends Partial<PolicyModuleType>>(name: string, payload: T) => {
    return {
        policy_module: {
            name,
            version: 1000
        },
        ...payload
    };
};

describe("PolicyManagerAVC", () => {
    let policyManager: PolicyManagerAVC;

    beforeEach(() => {
        policyManager = new PolicyManagerAVC();
    });

    it("can load policies", async ({ expect }) => {
        const policy: PolicyModuleType = makePolicy("base", {
            allow_types: ["0"],
            map_types: ["unlabeled_t"],
            deny_types: [],
            allow_types_on_targets: {},
            deny_types_on_targets: {}
        });

        await policyManager.loadModule("1", policy);

        expect([...(await policyManager.getLoadedModules("1")).entries()]).toStrictEqual([["base", policy]]);
    });

    it("can allow/deny permissions from the loaded policies", async ({ expect }) => {
        const policy1: PolicyModuleType = makePolicy("base", {
            map_types: ["unlabeled_t", "user_t", "moderator_t"],
            allow_types: [
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.BanMembers
            ],
            deny_types: [],
            allow_types_on_targets: {
                2: {
                    1: PermissionFlagsBits.KickMembers
                }
            },
            deny_types_on_targets: {
                2: {
                    1: PermissionFlagsBits.ChangeNickname
                }
            }
        });

        const policy2: PolicyModuleType = makePolicy("extra", {
            allow_types: [
                PermissionFlagsBits.KickMembers,
                0n,
                PermissionFlagsBits.BanMembers | PermissionFlagsBits.ChangeNickname
            ],
            map_types: ["unlabeled_t", "user_t", "moderator_t"],
            deny_types: [],
            allow_types_on_targets: {
                2: {
                    1: PermissionFlagsBits.ModerateMembers,
                    2: 0n
                },
                1: {
                    1: 0n
                }
            },
            deny_types_on_targets: {}
        });

        const guildId = "1";

        await policyManager.loadModule(guildId, policy1);
        await policyManager.loadModule(guildId, policy2);
        await policyManager.buildStore(guildId);

        expect(await policyManager.getPermissionsOf(guildId, "user_t")).toBe(PermissionFlagsBits.AttachFiles);
        expect(await policyManager.getPermissionsOf(guildId, "unlabeled_t")).toBe(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers
        );
        expect(await policyManager.getPermissionsOf(guildId, "moderator_t")).toBe(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.ChangeNickname
        );
        expect(await policyManager.getPermissionsOfWithTarget(guildId, "moderator_t", "user_t")).toBe(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers | PermissionFlagsBits.ModerateMembers
        );
    });

    it("relabeles entities as requested", async ({ expect }) => {
        const guildId = "1";
        const contexts = ["unlabeled_t", "user_t", "test_t"];

        const policy: PolicyModuleType = makePolicy("base", {
            allow_types: [0n, PermissionFlagsBits.SendMessages],
            map_types: contexts,
            deny_types: [],
            allow_types_on_targets: {},
            deny_types_on_targets: {},
            type_labeling: {
                commonPatterns: [
                    {
                        context: 1,
                        entity_attr: "id",
                        pattern: ["^111", "u"],
                        entity_type: "member"
                    },
                    {
                        context: 2,
                        entity_attr: "id",
                        pattern: ["^222", "u"],
                        entity_type: "member"
                    }
                ],
                memberPatterns: []
            }
        });

        await policyManager.loadModule(guildId, policy);
        await policyManager.buildStore(guildId);

        expect(await policyManager.getPermissionsOf(guildId, "unlabeled_t")).toBe(0n);
        expect(await policyManager.getPermissionsOf(guildId, "user_t")).toBe(PermissionFlagsBits.SendMessages);

        const client = createClient();
        const member1 = createMember(client, "111984877397764898567");
        const member2 = createMember(client, "111452566238769264744");
        const member3 = createMember(client, "141114987322228476464");
        const member4 = createMember(client, "222485767296476474677");

        const count = await policyManager.relabelEntities(guildId, [member1, member2, member3, member4]);

        expect(count).toBe(3);
        expect(await policyManager.getContextOf(guildId, member1)).toBe(contexts.indexOf("user_t"));
        expect(await policyManager.getContextOf(guildId, member2)).toBe(contexts.indexOf("user_t"));
        expect(await policyManager.getContextOf(guildId, member3)).toBe(contexts.indexOf("unlabeled_t"));
        expect(await policyManager.getContextOf(guildId, member4)).toBe(contexts.indexOf("test_t"));
    });

    it("reads caches from disk only once on module load", async ({ expect }) => {
        vi.mock("fs/promises", () => {
            const readFileMock = vi.fn(() => {
                throw new Error("File does not exist");
            });

            return {
                readFile: readFileMock,
                readFileMock
            };
        });

        const guildId = "1";
        const { readFileMock } = await import(<string>"fs/promises");
        readFileMock.mockClear();

        const policy: PolicyModuleType = makePolicy("base", {
            allow_types: [PermissionFlagsBits.BanMembers],
            map_types: ["unlabeled_t"],
            deny_types: [],
            allow_types_on_targets: {},
            deny_types_on_targets: {}
        });

        await policyManager.loadModule(guildId, policy);
        await policyManager.loadModule(guildId, policy);
        await policyManager.buildStore(guildId);

        expect(await policyManager.getPermissionsOf(guildId, "unlabeled_t")).toBe(PermissionFlagsBits.BanMembers);
        expect(await policyManager.getPermissionsOf(guildId, "unlabeled_t")).toBe(PermissionFlagsBits.BanMembers);
        expect(readFileMock).toHaveBeenCalledOnce();
    });

    it("does not read cache more than once when getting permissions with no modules", async ({ expect }) => {
        vi.mock("fs/promises", () => {
            const readFileMock = vi.fn(() => {
                throw new Error("File does not exist");
            });

            return {
                readFile: readFileMock,
                readFileMock
            };
        });

        const guildId = "1";
        const { readFileMock } = await import(<string>"fs/promises");
        readFileMock.mockClear();

        expect(await policyManager.getPermissionsOf(guildId, "unlabeled_t")).toBe(0n);
        expect(await policyManager.getPermissionsOf(guildId, "unlabeled_t")).toBe(0n);
        expect(readFileMock).toHaveBeenCalledOnce();
    });
});
