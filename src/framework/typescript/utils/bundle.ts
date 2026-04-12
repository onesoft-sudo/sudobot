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

import type Application from "@framework/app/Application";
import type Command from "@framework/commands/Command";
import type EventListener from "@framework/events/EventListener";
import type PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface";
import type AbstractQueuedJob from "@framework/queues/AbstractQueuedJob";
import type QueueManager from "@framework/queues/QueueManager";
import type Service from "@framework/services/Service";
import type { Events } from "@framework/types/ClientEvents";
import type Rule from "@main/moderation/Rule";
import type { RuleType } from "@schemas/all";

export const BUNDLE_DATA_SYMBOL = Symbol("BundleData");
export type BundleData = {
    services: Record<string, new (application: Application) => Service>;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    classes: Record<string, Function>;
    events: Record<
        string,
        new (application: Application) => EventListener<Events>
    >;
    commands: Record<
        string,
        new (
            application: Application,
            permissionManagerService: PermissionManagerServiceInterface
        ) => Command
    >;
    rules: Record<
        string,
        new (
            application: Application,
        ) => Rule<RuleType, unknown>
    >;
    queues: Record<
        string,
        new (
            application: Application,
            queueManager: QueueManager
        ) => AbstractQueuedJob<object>
    >;
    resources: Record<string, unknown>;
};

export const getBundleData = () =>
    (global as { [BUNDLE_DATA_SYMBOL]?: BundleData })[BUNDLE_DATA_SYMBOL];
export const hasBundleData = () => BUNDLE_DATA_SYMBOL in global;
