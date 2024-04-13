import StringArgument from "@framework/arguments/StringArgument";
import { describe, expect, it } from "vitest";
import { createApplication } from "../../mocks/application.mock";
import { initialize } from "./ArgumentTestUtils";

describe("Argument", async () => {
    createApplication();
    let data;

    describe("<commons>", () => {
        it("should parse an argument and return correct information", async () => {
            data = initialize({
                content: "test test",
                userId: "1",
                guildId: "1",
                prefix: "!"
            });

            const result = await StringArgument.performCast(
                data.context,
                data.content,
                data.argv,
                data.argv[1],
                1,
                "testarg",
                undefined,
                true
            );

            expect(result.value?.getRawValue()).toBe(data.argv[1]);
            expect(result.value?.getValue()).toBe(data.argv[1]);
            expect(result.value?.position).toBe(1);
            expect(result.value?.name).toBe("testarg");
            expect(result.error).toBeUndefined();
        });
    });
});
