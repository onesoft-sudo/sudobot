import { BeforeEach, TestCase } from "@tests/core/Test";
import { TestContext, TestSuite } from "@tests/core/TestSuite";
import ArgumentParser from "@framework/arguments/ArgumentParser";
import StringArgument from "@framework/arguments/StringArgument";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import Application from "@framework/app/Application";
import LegacyContext from "@framework/commands/LegacyContext";
import { createClient, createMessage } from "@tests/mocks/discord";
import { Client } from "discord.js";
import NumberArgument from "@framework/arguments/NumberArgument";

@TestSuite
class ArgumentParserTest {
    private application!: Application;
    private client!: Client;

    @BeforeEach
    public initialize() {
        this.application = new Application({ projectRootDirectoryPath: "", rootDirectoryPath: "", version: "1" });
        this.client = createClient();
    }

    @TestCase
    public async itParsesBasicPrimitiveArguments({ expect }: TestContext) {
        const argumentParser = new ArgumentParser(this.application);
        const args = ["hi", "500", "hello-again", "9000.35"];
        const argv = ["test", ...args];
        const context = new LegacyContext(this.application, createMessage(this.client), argv[0], argv, args);
        const result = await argumentParser.parse(context, {
            overloads: [
                {
                    definitions: [
                        {
                            name: "str",
                            type: StringArgument
                        },
                        {
                            name: "val1",
                            type: IntegerArgument
                        },
                        {
                            name: "msg",
                            type: StringArgument
                        },
                        {
                            name: "val2",
                            type: NumberArgument
                        }
                    ]
                }
            ]
        });

        expect(result.error).toBeUndefined();
        expect(result.args).toEqual({ str: args[0], val1: +args[1], msg: args[2], val2: +args[3] });
    }
}

export default ArgumentParserTest;
