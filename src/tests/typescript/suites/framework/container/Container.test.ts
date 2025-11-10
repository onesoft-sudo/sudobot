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

import { describe, expect, it, vi } from "vitest";
import Container from "@framework/container/Container";
import { Inject } from "@framework/container/Inject";

describe("Container", () => {
    it("can register factories and create basic objects", () => {
        class Thing1 {
            public test = 1;
        }

        class Thing2 {
            public test = true;
        }

        const container = new Container({ strict: true });

        container.register({
            type: Thing1
        });

        container.register({
            type: Thing2,
            factory: () => new Thing2(),
            singleton: true,
            id: "thing2"
        });

        const thing1_1 = container.get(Thing1);
        const thing1_2 = container.get(Thing1);

        expect(thing1_1).toBeInstanceOf(Thing1);
        expect(thing1_2).toBeInstanceOf(Thing1);
        expect(thing1_1).not.toBe(thing1_2);

        const thing2_1 = container.get(Thing2);
        const thing2_2 = container.get<Thing2>("thing2");

        expect(thing2_1).toBeInstanceOf(Thing2);
        expect(thing2_2).toBeInstanceOf(Thing2);
        expect(thing2_1).toBe(thing2_2);
    });

    it("can resolve constructor parameters and properties", () => {
        const random = +(Math.random() * 10000000).toString().split(".")[0];

        class SpecialObject {
            public constructor(public readonly random: number) {}
        }

        class Logger {
            public log = 1;
        }

        class EventHandler {
            @Inject()
            public readonly specialObject!: SpecialObject;

            public constructor(@Inject() public readonly logger: Logger) {}
        }

        class Application {
            public readonly eventHandler: EventHandler;

            public constructor(
                @Inject() eventHandler: EventHandler,
                @Inject() public readonly logger: Logger
            ) {
                this.eventHandler = eventHandler;
            }
        }

        const container = new Container();

        container.register({
            type: SpecialObject,
            factory: () => new SpecialObject(random),
            singleton: true
        });

        const application = container.get(Application);

        expect(application).toBeInstanceOf(Application);
        expect(application.eventHandler).toBeInstanceOf(EventHandler);
        expect(application.logger).toBeInstanceOf(Logger);
        expect(application.eventHandler.logger).toBeInstanceOf(Logger);
        expect(application.eventHandler.specialObject).toBeInstanceOf(SpecialObject);
        expect(application.eventHandler.specialObject.random).toBe(random);
    });

    it("can resolve method parameters and call them correctly", () => {
        class User {
            public test = 1;
        }

        class Application {
            public useUser(@Inject() _user: User) {}
        }

        const mockUseUser = vi.fn();
        Application.prototype.useUser = mockUseUser;

        const container = new Container();
        const application = container.get(Application);

        container.callMethod(application, "useUser", [undefined]);

        expect(mockUseUser).toHaveBeenCalledOnce();
        expect(mockUseUser.mock.lastCall?.[0]).toBeInstanceOf(User);
    });
});
