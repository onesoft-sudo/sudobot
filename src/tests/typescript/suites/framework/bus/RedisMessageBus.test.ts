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

import { TestCase } from "@tests/core/Test";
import { TestContext, TestSuite } from "@tests/core/TestSuite";
import RedisMessageBus from "@framework/bus/RedisMessageBus";
import { expect, vi } from "vitest";
import * as ioredis from "ioredis";
import { encode } from "@msgpack/msgpack";

const RedisConstructorMock = vi.fn();

vi.mock("ioredis", () => {
    const subscribe = vi.fn();
    const publish = vi.fn();
    const on = vi.fn();

    return {
        subscribe,
        publish,
        on,
        Redis: class Redis {
            public constructor(...args: unknown[]) {
                RedisConstructorMock(...args);
            }

            public subscribe = subscribe;
            public publish = publish;
            public on = on;
        }
    };
});

@TestSuite
class RedisMessageBusTest {
    @TestCase
    public itConnectsToRedis() {
        RedisConstructorMock.mockClear();

        const url = "redis://localhost:1234/0";
        new RedisMessageBus(url);

        expect(RedisConstructorMock).toHaveBeenNthCalledWith(1, url);
        expect(RedisConstructorMock).toHaveBeenNthCalledWith(2, url);
    }

    @TestCase
    public async itCorrectlySubscribesToChannels({ expect }: TestContext) {
        const url = "redis://localhost:1234/0";
        const bus = new RedisMessageBus(url);
        const onEvent = vi.fn();
        await bus.subscribe("event", onEvent);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect((ioredis as unknown as ioredis.Redis).subscribe).toHaveBeenCalledExactlyOnceWith("event");
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect((ioredis as unknown as ioredis.Redis).on).toHaveBeenCalledTimes(2);
        expect(
            ((ioredis as unknown as ioredis.Redis).on as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
        ).toBe("messageBuffer");
        expect(
            ((ioredis as unknown as ioredis.Redis).on as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]
        ).toBeInstanceOf(Function);
    }

    @TestCase
    public async itCorrectlyPublishesMessages({ expect }: TestContext) {
        const url = "redis://localhost:1234/0";
        const bus = new RedisMessageBus(url);
        await bus.publish("event", { data: "idk" });

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect((ioredis as unknown as ioredis.Redis).publish).toHaveBeenCalledTimes(1);
        expect(
            ((ioredis as unknown as ioredis.Redis).publish as unknown as ReturnType<typeof vi.fn>).mock.lastCall?.[0]
        ).toBe("event");
        expect(
            ((ioredis as unknown as ioredis.Redis).publish as unknown as ReturnType<typeof vi.fn>).mock.lastCall?.[1]
        ).toStrictEqual(Buffer.from(encode({ data: "idk" })));
    }
}

export default RedisMessageBusTest;
