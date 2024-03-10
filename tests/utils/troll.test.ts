import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it } from "bun:test";
import type Client from "../../src/core/Client";
import ConfigManager, { GuildConfigContainer } from "../../src/services/ConfigManager";
import { SystemConfigSchema } from "../../src/types/SystemConfigSchema";
import { protectSystemAdminsFromCommands } from "../../src/utils/troll";
import { createClient } from "../mocks/client.mock";
import { createMessage } from "../mocks/message.mock";
import { randomSnowflake } from "../mocks/snowflakes";

describe("troll functionalities", () => {
    let client: Client;
    let sysAdminId, guildId;

    beforeEach(() => {
        sysAdminId = randomSnowflake();
        guildId = randomSnowflake();
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

    it("should protect system admins from troll command", async () => {
        const [message] = createMessage(faker.lorem.sentence(), sysAdminId, guildId);
        let count = 1;

        for (const key of ["bean_safe", "shot_safe", "fakeban_safe"] as const) {
            const result = await protectSystemAdminsFromCommands(client, message, sysAdminId, key);
            expect(result).toBe(true);
            expect(message.reply).toHaveBeenCalledTimes(count++);
        }
    });
});
