import "reflect-metadata";

import Client from "@/core/Client";
import Application from "@framework/app/Application";
import ArgumentParser from "@framework/arguments/ArgumentParserNew";
import { beforeEach, describe, expect, it } from "vitest";

describe("ArgumentParser (new)", () => {
    let application: Application;
    let client: Client;
    let parser: ArgumentParser;

    beforeEach(() => {
        application = new Application("", "", "");
        client = new Client({ intents: [] });
        application.setClient(client);
        parser = new ArgumentParser(client);
    });

    it("should parse arguments", async () => {
        const commandContent = "!test -s hello 12";
        const argv = commandContent.split(/\s+/);
        const args = argv.slice(1);

        expect(false).toBe(true); // fail
    });
});
