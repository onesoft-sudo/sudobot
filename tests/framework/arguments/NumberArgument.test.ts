import { describe, expect, it } from "vitest";
import NumberArgument from "../../../src/framework/arguments/NumberArgument";
import { createApplication } from "../../mocks/application.mock";
import { initialize } from "./ArgumentTestUtils";

describe("NumberArgument", () => {
    createApplication();

    let data: ReturnType<typeof initialize>;

    it("should parse a floating point number argument", async () => {
        data = initialize({
            content: "test 123.24 test",
            userId: "1",
            guildId: "1",
            prefix: "!"
        });

        const result = await NumberArgument.performCast(
            data.context,
            data.content,
            data.argv,
            data.argv[1],
            1,
            "testarg",
            undefined,
            true
        );

        expect(result.value?.getRawValue()).toBe("123.24");
        expect(result.value?.getValue()).toBe(123.24);
        expect(result.error).toBeUndefined();
    });

    it("should throw an error when the argument is not a number", async () => {
        data = initialize({
            content: "test nan test",
            userId: "1",
            guildId: "1",
            prefix: "!"
        });

        const result = await NumberArgument.performCast(
            data.context,
            data.content,
            data.argv,
            data.argv[1],
            1,
            "testarg",
            undefined,
            true
        );

        expect(result.value).toBeUndefined();
        expect(result.error).toBeDefined();
    });
});
