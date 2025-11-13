import { beforeEach, describe, expect, it } from "vitest";
import PolicyManagerAVC from "@framework/selinux/PolicyManagerAVC";
import type { PolicyModuleType } from "@framework/selinux/PolicyModuleSchema";
import { PermissionFlagsBits } from "discord.js";

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

    it("can load policies", () => {
        const policy: PolicyModuleType = makePolicy("base", {
            allow_types: {
                0: "0"
            },
            map_types: {
                0: "unlabeled_t"
            },
            deny_types: {},
            allow_types_on_targets: {},
            deny_types_on_targets: {}
        });

        policyManager.loadModule("1", policy);

        expect([...policyManager.getLoadedModules("1").entries()]).toStrictEqual([["base", policy]]);
    });

    it("can allow/deny permissions from the loaded policies", () => {
        const policy1: PolicyModuleType = makePolicy("base", {
            allow_types: [
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.BanMembers
            ],
            map_types: ["unlabeled_t", "user_t", "moderator_t"],
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
                    1: PermissionFlagsBits.ModerateMembers
                }
            },
            deny_types_on_targets: {}
        });

        const guildId = "1";

        policyManager.loadModule(guildId, policy1);
        policyManager.loadModule(guildId, policy2);
        policyManager.compileAll(guildId);

        expect(policyManager.getPermissionsOf(guildId, "user_t")).toBe(PermissionFlagsBits.AttachFiles);
        expect(policyManager.getPermissionsOf(guildId, "unlabeled_t")).toBe(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers
        );
        expect(policyManager.getPermissionsOf(guildId, "moderator_t")).toBe(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.ChangeNickname
        );
        expect(policyManager.getPermissionsOfWithTarget(guildId, "moderator_t", "user_t")).toBe(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers | PermissionFlagsBits.ModerateMembers
        );
    });
});
