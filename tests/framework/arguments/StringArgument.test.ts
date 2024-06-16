import { faker } from "@faker-js/faker";
import StringArgument from "@framework/arguments/StringArgument";
import { beforeEach, describe, expect, it } from "vitest";
import { createApplication } from "../../mocks/application.mock";
import { initialize } from "./ArgumentTestUtils";

describe("StringArgument", () => {
    createApplication();
    let data: ReturnType<typeof initialize>;

    beforeEach(() => {
        data = initialize({
            content: faker.lorem.words(5),
            userId: "1",
            guildId: "1",
            prefix: "!"
        });
    });

    it("should parse a string argument", async () => {
        const arg1 = await StringArgument.performCast(
            data.context,
            data.content,
            data.argv,
            data.argv[1],
            0,
            "testarg",
            undefined,
            true
        );
        const arg3 = await StringArgument.performCast(
            data.context,
            data.content,
            data.argv,
            data.argv[3],
            2,
            "testarg3",
            undefined,
            true
        );

        expect(arg1.value?.getRawValue()).toBe(data.argv[1]);
        expect(arg1.value?.getValue()).toBe(data.argv[1]);
        expect(arg1.error).toBeUndefined();

        expect(arg3.value?.getRawValue()).toBe(data.argv[3]);
        expect(arg3.value?.getValue()).toBe(data.argv[3]);
        expect(arg3.error).toBeUndefined();
    });
});
