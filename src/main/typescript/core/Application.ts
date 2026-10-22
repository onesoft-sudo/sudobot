/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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

import type { ApplicationOptions } from "@framework/app/Application.js";
import BaseApplication from "@framework/app/Application.js";
import GenericShardIPC from "@framework/bus/GenericShardIPC.js";
import MessageBus, { type IPCRequest } from "@framework/bus/MessageBus.js";
import { MessageController, WithResourceId } from "@framework/bus/MessageController.js";
import RedisMessageBus from "@framework/bus/RedisMessageBus.js";
import ShardIPC from "@framework/bus/ShardIPC.js";
import type Kernel from "@framework/core/Kernel.js";
import Database from "@main/database/Database.js";
import { getEnv } from "@main/env/env.js";
import { shardBusId } from "@main/utils/shard.js";

@MessageController
class HealthzController {
    @WithResourceId("/healthz/index")
    public index(request: IPCRequest<void>) {
        return MessageBus.response(request, {
            payload: {
                health: "ok",
                uptime: 5000
            }
        });
    }

    @WithResourceId("/healthz/post")
    public post(request: IPCRequest<void>) {
        return MessageBus.response(request, {
            payload: {
                updated: true
            }
        });
    }
}

class Application extends BaseApplication {
    public readonly database = new Database(this, {
        url: getEnv().SUDOBOT_DATABASE_URL
    });

    public override readonly bus: MessageBus;
    public override readonly ipc: ShardIPC;

    public constructor(options: ApplicationOptions) {
        super(options);

        this.bus = new RedisMessageBus({
            url: getEnv().SUDOBOT_VALKEY_URL,
            busIds: this.shards.map(shardId => shardBusId(shardId))
        });

        this.ipc = new GenericShardIPC(this);
    }

    public override async run(kernel: Kernel) {
        return super.run(kernel);
    }
}

export default Application;
