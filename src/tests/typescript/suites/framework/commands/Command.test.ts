/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { BeforeEach, TestCase } from "@tests/core/Test";
import { TestContext, TestSuite } from "@tests/core/TestSuite";
import { vi } from "vitest";
import Command from "@framework/commands/Command";
import Application from "@framework/app/Application";
import LegacyContext from "@framework/commands/LegacyContext";
import { createClient, createMember, createMessage } from "@tests/mocks/discord";
import { Client, PermissionFlagsBits, PermissionsBitField } from "discord.js";

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

        const context = new LegacyContext(this.application, createMessage(this.client), "name", "name", [], []);
        await command.run(context);

        expect(command.execute).toHaveBeenCalledExactlyOnceWith(context, {}, {});
    }

    @TestCase
    public async itAbortsExecutionIfPermissionsAreMissing({ expect }: TestContext) {
        const command = new (class extends Command {
            public override readonly name = "name";
            public override readonly permissions = [PermissionFlagsBits.BanMembers];
            public execute = vi.fn();
        })(this.application);

        const message1 = createMessage(this.client);
        const message2 = createMessage(this.client);
        const message3 = createMessage(this.client);
        const member1 = createMember(this.client);
        const member2 = createMember(this.client);

        Object.defineProperty(member1, "permissions", {
            value: new PermissionsBitField(["SendMessages", "AddReactions"])
        });

        Object.defineProperty(member2, "permissions", {
            value: new PermissionsBitField(["BanMembers", "AddReactions"])
        });

        Object.defineProperty(message2, "member", {
            value: member1
        });

        Object.defineProperty(message3, "member", {
            value: member2
        });

        const context1 = new LegacyContext(this.application, message1, "name", "name", [], []);
        const context2 = new LegacyContext(this.application, message2, "name", "name", [], []);
        const context3 = new LegacyContext(this.application, message3, "name", "name", [], []);

        const error1 = vi.fn().mockImplementation(async () => {});
        const error2 = vi.fn().mockImplementation(async () => {});
        const error3 = vi.fn().mockImplementation(async () => {});

        context1.error = error1;
        context2.error = error2;
        context3.error = error3;

        await command.run(context1);
        await command.run(context2);

        expect(command.execute).not.toHaveBeenCalled();
        expect(error1).toHaveBeenCalledOnce();
        expect(error2).toHaveBeenCalledOnce();
        expect(error1.mock.calls[0]?.[0]).toMatch(/You don't have enough permissions/);
        expect(error2.mock.calls[0]?.[0]).toMatch(/You don't have enough permissions/);

        await command.run(context3);
        expect(command.execute).toHaveBeenCalledExactlyOnceWith(context3, {}, {});
        expect(error3).not.toHaveBeenCalled();
    }
}

export default CommandTest;
