import "../setup";

import assert from "assert";
import {
    APIGuild,
    APIRole,
    Guild,
    GuildDefaultMessageNotifications,
    GuildMember,
    PermissionsBitField,
    PermissionsString
} from "discord.js";
import { RawGuildMemberData } from "discord.js/typings/rawDataTypes";
import fs from "fs";
import fsPromises from "fs/promises";
import { after, before, beforeEach, describe, it, test } from "node:test";
import Client from "../../src/core/Client";
import { randomSnowflake } from "../utils";

const GUILD_ID = randomSnowflake();

function fileHandler(path: any) {
    if (path === configPath) {
        return `
            {
                "${GUILD_ID}": {}
            }
        `;
    } else if (path === systemConfigPath) {
        return `
            {
                "system_admins": ["${randomSnowflake()}"]
            }
        `;
    }
}

const client = new Client(
    {
        intents: []
    },
    {
        services: ["@services/ConfigManager", "@services/PermissionManager"]
    }
);

const readFileSync = fs.readFileSync;
const readFile = fsPromises.readFile;

describe("Permission Manager", () => {
    let owner_id: string, user_id: string, mod_role: string, admin_role: string;
    let roles: APIRole[];
    let guild: Guild;
    let normalMember: GuildMember, moderatorMember: GuildMember, adminMember: GuildMember, adminOnlyMember: GuildMember;

    before(() => {
        (fs as any).readFileSync = (path: string, ...args: [any]) =>
            path === configPath || path === systemConfigPath ? fileHandler(path) : readFileSync(path, ...args);
        (fsPromises as any).readFile = (path: string, ...args: [any]) =>
            path === configPath || path === systemConfigPath ? fileHandler(path) : readFile(path, ...args);

        return client.boot();
    });

    after(() => {
        (fs as any).readFileSync = readFileSync;
        (fsPromises as any).readFile = readFile;
    });

    test("Initialization", () => {
        assert.strictEqual(Object.keys(client.permissionManager.levels).length, 100);
        assert.deepEqual(client.permissionManager.guildPermissionLevels, {});
    });

    beforeEach(() => {
        owner_id = randomSnowflake();
        user_id = randomSnowflake();
        mod_role = randomSnowflake();
        admin_role = randomSnowflake();
        roles = (
            [
                {
                    id: mod_role,
                    name: "Moderator",
                    permissions: new PermissionsBitField(["BanMembers", "KickMembers"]).bitfield.toString()
                },
                {
                    id: admin_role,
                    name: "Admin",
                    permissions: new PermissionsBitField("Administrator").bitfield.toString()
                },
                {
                    id: GUILD_ID,
                    name: "@everyone",
                    permissions: new PermissionsBitField("SendMessages").bitfield.toString()
                }
            ] as APIRole[]
        ).map((role, index) => ({
            ...role,
            color: 0xf14a69,
            hoist: false,
            managed: true,
            mentionable: true,
            position: index
        }));

        guild = new (Guild as any)(client, {
            id: GUILD_ID,
            afk_channel_id: null,
            application_id: null,
            default_message_notifications: GuildDefaultMessageNotifications.OnlyMentions,
            description: null,
            owner_id,
            discovery_splash: null,
            name: "Test Guild",
            roles,
            banner: null
        } as Partial<APIGuild>);

        normalMember = new (GuildMember as any)(
            client,
            {
                user: {
                    discriminator: "2084",
                    global_name: "ABC",
                    id: user_id,
                    username: "root"
                },
                roles: [GUILD_ID],
                guild_id: GUILD_ID,
                joined_at: new Date().toISOString()
            } as RawGuildMemberData,
            guild
        );

        moderatorMember = new (GuildMember as any)(
            client,
            {
                user: {
                    discriminator: "2084",
                    global_name: "ABC",
                    id: user_id,
                    username: "root"
                },
                roles: [mod_role, GUILD_ID],
                guild_id: GUILD_ID,
                joined_at: new Date().toISOString()
            } as RawGuildMemberData,
            guild
        );

        adminMember = new (GuildMember as any)(
            client,
            {
                user: {
                    discriminator: "2084",
                    global_name: "ABC",
                    id: user_id,
                    username: "root"
                },
                roles: [admin_role, mod_role, GUILD_ID],
                guild_id: GUILD_ID,
                joined_at: new Date().toISOString()
            } as RawGuildMemberData,
            guild
        );

        adminOnlyMember = new (GuildMember as any)(
            client,
            {
                user: {
                    discriminator: "2084",
                    global_name: "ABC",
                    id: user_id,
                    username: "root"
                },
                roles: [admin_role, GUILD_ID],
                guild_id: GUILD_ID,
                joined_at: new Date().toISOString()
            } as RawGuildMemberData,
            guild
        );
    });

    it("Can determine member permissions", () => {
        const normalResult = [...client.permissionManager.getMemberPermissions(normalMember, true).values()];
        const moderatorResult = [...client.permissionManager.getMemberPermissions(moderatorMember, true).values()];
        const adminResult = [...client.permissionManager.getMemberPermissions(adminMember, true).values()];
        const adminOnlyResult = [...client.permissionManager.getMemberPermissions(adminOnlyMember, true).values()];

        normalResult.sort();
        moderatorResult.sort();
        adminResult.sort();
        adminOnlyResult.sort();

        assert.deepEqual(normalResult, ["SendMessages"] as PermissionsString[]);
        assert.deepEqual(moderatorResult, ["BanMembers", "KickMembers", "SendMessages"] as PermissionsString[]);
        assert.deepEqual(adminResult, ["Administrator", "BanMembers", "KickMembers", "SendMessages"] as PermissionsString[]);
        assert.deepEqual(adminOnlyResult, ["Administrator", "SendMessages"] as PermissionsString[]);
    });

    it("Can determine if a member is able to bypass AutoMod", () => {
        assert.strictEqual(client.permissionManager.isImmuneToAutoMod(normalMember), false);
        assert.strictEqual(client.permissionManager.isImmuneToAutoMod(moderatorMember), false);
        assert.strictEqual(
            client.permissionManager.isImmuneToAutoMod(moderatorMember, [PermissionsBitField.Flags.BanMembers]),
            true
        );
        assert.strictEqual(client.permissionManager.isImmuneToAutoMod(adminMember), true);
        assert.strictEqual(client.permissionManager.isImmuneToAutoMod(adminMember, [PermissionsBitField.Flags.BanMembers]), true);
        assert.strictEqual(client.permissionManager.isImmuneToAutoMod(adminOnlyMember), true);
        assert.strictEqual(
            client.permissionManager.isImmuneToAutoMod(adminOnlyMember, [PermissionsBitField.Flags.BanMembers]),
            true
        );
    });
});
