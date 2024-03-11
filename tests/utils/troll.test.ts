import { faker } from "@faker-js/faker";
import { Snowflake } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Client from "../../src/core/Client";
import ConfigManager, { GuildConfigContainer } from "../../src/services/ConfigManager";
import { SystemConfigSchema } from "../../src/types/SystemConfigSchema";
import { protectSystemAdminsFromCommands } from "../../src/utils/troll";
import { createClient } from "../mocks/client.mock";
import { createMessage } from "../mocks/message.mock";
import { randomSnowflake } from "../mocks/snowflakes";

describe("troll functionalities", () => {
    let client: Client;
    let sysAdminId: Snowflake, guildId: Snowflake, normalUserId: Snowflake;

    beforeEach(() => {
        sysAdminId = randomSnowflake();
        guildId = randomSnowflake();
        normalUserId = randomSnowflake();
        client = createClient();
        client.configManager = {
            systemConfig: SystemConfigSchema.parse({
                system_admins: [sysAdminId]
            }),
            config: {
                [guildId]: {
                    commands: {
                        bean_safe: [],
                        shot_safe: [],
                        fakeban_safe: []
                    }
                }
            } as unknown as GuildConfigContainer
        } as ConfigManager;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it("should protect system admins and itself", async () => {
        const [sysAdminMessage] = createMessage(faker.lorem.sentence(), sysAdminId, guildId);
        const [selfMessage] = createMessage(faker.lorem.sentence(), client.user!.id, guildId);
        let count = 1;

        for (const key of ["bean_safe", "shot_safe", "fakeban_safe"] as const) {
            const sysAdminResult = await protectSystemAdminsFromCommands(
                client,
                sysAdminMessage,
                sysAdminId,
                key
            );
            const selfResult = await protectSystemAdminsFromCommands(
                client,
                selfMessage,
                sysAdminId,
                key
            );

            expect(sysAdminResult).toBe(true);
            expect(selfResult).toBe(true);
            expect(sysAdminMessage.reply).toHaveBeenCalledTimes(count);
            expect(selfMessage.reply).toHaveBeenCalledTimes(count);

            count++;
        }
    });

    it("should ignore normal users", async () => {
        const [message] = createMessage(faker.lorem.sentence(), normalUserId, guildId);

        for (const key of ["bean_safe", "shot_safe", "fakeban_safe"] as const) {
            const result = await protectSystemAdminsFromCommands(
                client,
                message,
                normalUserId,
                key
            );

            expect(result).toBe(false);
            expect(message.reply).toHaveBeenCalledTimes(0);
        }
    });
});
