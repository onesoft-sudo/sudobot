import "reflect-metadata";

import Application from "@framework/app/Application";
import ArgumentParser from "@framework/arguments/ArgumentParserNew";
import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import { InvalidArgumentError } from "@framework/arguments/InvalidArgumentError";
import NumberArgument from "@framework/arguments/NumberArgument";
import StringArgument from "@framework/arguments/StringArgument";
import { Command } from "@framework/commands/Command";
import LegacyContext from "@framework/commands/LegacyContext";
import { Message } from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createApplication } from "../../mocks/application.mock";

@ArgumentSchema.Definition({
    names: ["string"],
    types: [StringArgument],
    optional: false
})
@ArgumentSchema.Definition({
    names: ["number"],
    types: [NumberArgument],
    optional: false
})
@ArgumentSchema.Options([
    {
        id: "option",
        longNames: ["option"],
        shortNames: ["o"],
        requiresValue: false,
        required: false
    },
    {
        id: "flag",
        longNames: ["flag"],
        shortNames: ["f"],
        requiresValue: true,
        required: false
    }
])
class TestCommand {
    public readonly name = "test";
    public readonly description = "Test command";

    public async execute() {
        return;
    }
}

describe("ArgumentParser", () => {
    let application: Application;
    let parser: ArgumentParser;

    beforeEach(() => {
        application = createApplication();
        parser = new ArgumentParser();
    });

    it("should parse basic arguments", async () => {
        const commandContent = "test hello 12";
        const argv = commandContent.split(/\s+/);
        const args = argv.slice(1);

        const result = await parser.parse({
            command: new TestCommand() as unknown as Command,
            context: new LegacyContext("test", commandContent, {} as Message<true>, args, argv)
        });

        expect(result).toEqual({
            value: {
                parsedArgs: {
                    string: "hello",
                    number: 12
                },
                parsedOptions: {}
            },
            errors: {}
        });
    });

    it("should parse basic arguments with options", async () => {
        const commandContent = "test -o hello -f 486 12";
        const argv = commandContent.split(/\s+/);
        const args = argv.slice(1);

        const result = await parser.parse({
            command: new TestCommand() as unknown as Command,
            context: new LegacyContext("test", commandContent, {} as Message<true>, args, argv)
        });

        expect(result).toEqual({
            value: {
                parsedArgs: {
                    string: "hello",
                    number: 12
                },
                parsedOptions: {
                    option: true,
                    flag: "486"
                }
            },
            errors: {}
        });
    });

    it("should throw an error if arguments are passed incorrectly", () => {
        const commandContent = "test hello";
        const argv = commandContent.split(/\s+/);
        const args = argv.slice(1);

        return expect(
            parser.parse({
                command: new TestCommand() as unknown as Command,
                context: new LegacyContext("test", commandContent, {} as Message<true>, args, argv),
                throwOnError: true
            })
        ).rejects.toThrowError(InvalidArgumentError);
    });
});
