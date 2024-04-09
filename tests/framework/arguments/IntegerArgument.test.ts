import { describe, expect, it } from "vitest";
import IntegerArgument from "../../../src/framework/arguments/IntegerArgument";
import { createApplication } from "../../mocks/application.mock";
import { initialize } from "./ArgumentTestUtils";

describe("IntegerArgument", () => {
    createApplication();

    let data: ReturnType<typeof initialize>;

    it("should parse a integer argument", async () => {
        data = initialize({
            content: "test 123 test",
            userId: "1",
            guildId: "1",
            prefix: "!"
        });

        const result = await IntegerArgument.performCast(
            data.context,
            data.content,
            data.argv,
            data.argv[1],
            1,
            "testarg",
            undefined,
            true
        );

        expect(result.value?.getRawValue()).toBe("123");
        expect(result.value?.getValue()).toBe(123);
        expect(result.error).toBeUndefined();
    });

    it("should throw an error when the argument is not a number", async () => {
        data = initialize({
            content: "test nan test",
            userId: "1",
            guildId: "1",
            prefix: "!"
        });

        const result = await IntegerArgument.performCast(
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
