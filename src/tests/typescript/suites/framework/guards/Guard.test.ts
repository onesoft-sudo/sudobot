import Application from "@framework/app/Application";
import Command from "@framework/commands/Command";
import LegacyContext from "@framework/commands/LegacyContext";
import Guard from "@framework/guards/Guard";
import { GuardStatusCode } from "@framework/guards/GuardStatusCode";
import { BeforeEach, TestCase } from "@tests/core/Test";
import { TestSuite } from "@tests/core/TestSuite";
import { createClient, createMessage } from "@tests/mocks/discord";
import { Client } from "discord.js";
import { TestContext, vi } from "vitest";

@TestSuite
class GuardTest {
    private application!: Application;
    private client!: Client;

    @BeforeEach
    public initialize() {
        this.application = new Application({ projectRootDirectoryPath: "", rootDirectoryPath: "", version: "1" });
        this.client = createClient();
    }

    @TestCase
    public async itProtectsCommandsAsNeeded({ expect }: TestContext) {
        let code = GuardStatusCode.Failure;
        const check = vi.fn(() => code);

        class TestGuard extends Guard {
            protected override check = check;
        }

        const command = new (class extends Command {
            public override readonly name = "name";
            public override readonly guards = [TestGuard];
            public override execute = vi.fn();
        })(this.application);

        const context = new LegacyContext(this.application, createMessage(this.client), "name", [], []);
        const error = vi.fn();
        context.error = error;
        await command.run(context);

        expect(command.execute).not.toBeCalled();
        expect(error.mock.calls[0]?.[0]).toMatch(/You aren't permitted/);
        expect(check).toHaveBeenCalledExactlyOnceWith(command, context);

        code = GuardStatusCode.Success;
        error.mockClear();
        check.mockClear();
        command.execute.mockClear();

        await command.run(context);

        expect(command.execute).toHaveBeenCalledExactlyOnceWith(context, [], {});
        expect(error).not.toBeCalled();
        expect(check).toHaveBeenCalledExactlyOnceWith(command, context);
    }
}

export default GuardTest;
