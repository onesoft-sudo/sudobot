import { beforeEach, describe, expect, it } from "vitest";
import PolicyManager from "@framework/selinux/PolicyManager";
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

describe("PolicyManager", () => {
    let policyManager: PolicyManager;

    beforeEach(() => {
        policyManager = new PolicyManager();
    });

    it("can load policies", () => {
        const policy: PolicyModuleType = makePolicy("base", {
            allow_types: ["0"],
            map_types: ["unlabeled_t"],
            deny_types: []
        });

        policyManager.loadModule(policy);

        expect([...policyManager.getLoadedModules().entries()]).toStrictEqual([["base", policy]]);
    });

    it("can compile multiple policy modules after load", () => {
        const policy1: PolicyModuleType = makePolicy("base", {
            allow_types: [PermissionFlagsBits.BanMembers, PermissionFlagsBits.AddReactions],
            map_types: ["unlabeled_t"],
            deny_types: []
        });

        const policy2: PolicyModuleType = makePolicy("extra", {
            allow_types: [PermissionFlagsBits.KickMembers],
            map_types: ["unlabeled_t"],
            deny_types: [PermissionFlagsBits.AddReactions]
        });

        policyManager.loadModule(policy1);
        policyManager.loadModule(policy2);
        policyManager.compileAll();

        expect(policyManager.getCurrentAVCStore()).toStrictEqual({
            mapTypes: ["unlabeled_t"],
            allowTypes: [PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers],
            denyTypes: [PermissionFlagsBits.AddReactions]
        });
    });

    it("can allow/deny permissions from the loaded policies", () => {
        const policy1: PolicyModuleType = makePolicy("base", {
            allow_types: [PermissionFlagsBits.BanMembers, PermissionFlagsBits.AttachFiles],
            map_types: ["unlabeled_t", "user_t"],
            deny_types: []
        });

        const policy2: PolicyModuleType = makePolicy("extra", {
            allow_types: [PermissionFlagsBits.KickMembers, 0n],
            map_types: ["unlabeled_t", "user_t"],
            deny_types: []
        });

        policyManager.loadModule(policy1);
        policyManager.loadModule(policy2);
        policyManager.compileAll();

        expect(policyManager.getPermissionsOf("user_t")).toBe(PermissionFlagsBits.AttachFiles);
        expect(policyManager.getPermissionsOf("unlabeled_t")).toBe(
            PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers
        );
    });
});
