import { beforeEach, describe, expect, it } from "vitest";
import RestStringArgument from "../../../src/framework/arguments/RestStringArgument";
import { createApplication } from "../../mocks/application.mock";
import { initialize } from "./ArgumentTestUtils";

describe("RestStringArgument", () => {
    createApplication();
    let data: ReturnType<typeof initialize>;

    beforeEach(() => {
        data = initialize({
            content: "test a b c d e f",
            userId: "1",
            guildId: "1",
            prefix: "!"
        });
    });

    it("should parse a rest string argument", async () => {
        const result = await RestStringArgument.performCast(
            data.context,
            data.content,
            data.argv,
            data.argv[2],
            1,
            "testarg",
            undefined,
            true
        );

        expect(result.value?.getRawValue()).toBe("b");
        expect(result.value?.getValue()).toBe("b c d e f");
        expect(result.error).toBeUndefined();
    });
});
