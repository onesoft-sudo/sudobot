import { BeforeEach, TestCase } from "@tests/core/Test";
import { TestContext, TestSuite } from "@tests/core/TestSuite";
import { vi } from "vitest";
import Command from "@framework/commands/Command";
import Application from "@framework/app/Application";
import LegacyContext from "@framework/commands/LegacyContext";
import { createClient, createMessage } from "@tests/mocks/discord";
import { Client, PermissionFlagsBits } from "discord.js";

@TestSuite
class CommandTest {
    private application!: Application;
    private client!: Client;

    @BeforeEach
    public initialize() {
        this.application = new Application({ projectRootDirectoryPath: "", rootDirectoryPath: "", version: "1" });
        this.client = createClient();
    }

    @TestCase
    public async itCallsTheExecuteMethod({ expect }: TestContext) {
        const command = new (class extends Command {
            public override readonly name = "name";
            public execute = vi.fn();
        })(this.application);

        const context = new LegacyContext(this.application, createMessage(this.client), "name", [], []);
        await command.run(context);

        expect(command.execute).toHaveBeenCalledExactlyOnceWith(context, [], {});
    }

    @TestCase
    public async itAbortsExecutionIfPermissionsAreMissing({ expect }: TestContext) {
        const command = new (class extends Command {
            public override readonly name = "name";
            public override readonly permissions = [PermissionFlagsBits.BanMembers];
            public execute = vi.fn();
        })(this.application);

        const context = new LegacyContext(this.application, createMessage(this.client), "name", [], []);
        const error = vi.fn();
        context.error = error;
        await command.run(context);

        expect(command.execute).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledOnce();
        expect(error.mock.calls[0]?.[0]).toMatch(/You don't have enough permissions/);
    }
}

export default CommandTest;
