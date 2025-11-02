import Application from "@framework/app/Application";
import { describe, expect, it } from "vitest";

describe("Application", () => {
    it("can be instantiated", () => {
        expect(
            new Application({
                projectRootDirectoryPath: "/",
                rootDirectoryPath: "/",
                version: "1"
            })
        ).toBeInstanceOf(Application);
    });
});
