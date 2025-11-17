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

import Application from "@framework/app/Application";
import Command from "@framework/commands/Command";
import LegacyContext from "@framework/commands/LegacyContext";
import Guard from "@framework/guards/Guard";
import { GuardStatusCode } from "@framework/guards/GuardStatusCode";
import PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface";
import { BeforeEach, TestCase } from "@tests/core/Test";
import { TestSuite } from "@tests/core/TestSuite";
import { createClient, createMessage } from "@tests/mocks/discord";
import PermissionManagerService from "@tests/mocks/permissions/PermissionManagerService";
import { Client } from "discord.js";
import { TestContext, vi } from "vitest";

@TestSuite
class GuardTest {
    private application!: Application;
    private client!: Client;
    private permissionManagerService!: PermissionManagerServiceInterface;

    @BeforeEach
    public initialize() {
        this.application = new Application({ projectRootDirectoryPath: "", rootDirectoryPath: "", version: "1" });
        this.client = createClient();
        this.permissionManagerService = new PermissionManagerService(this.application);
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
            public override readonly description = "name";
            public override readonly guards = [TestGuard];
            public override execute = vi.fn();
        })(this.application, this.permissionManagerService);

        const context = new LegacyContext(this.application, createMessage(this.client), "name", "name", [], []);
        const error = vi.fn().mockImplementation(async () => {});
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

        expect(command.execute).toHaveBeenCalledExactlyOnceWith(context, {}, {});
        expect(error).not.toBeCalled();
        expect(check).toHaveBeenCalledExactlyOnceWith(command, context);
    }
}

export default GuardTest;
