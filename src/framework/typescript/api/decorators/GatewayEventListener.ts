/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type { ClientEvents } from "../../types/ClientEvents";

export type EventListenerInfo = {
    event: keyof ClientEvents | "raw";
    methodName: string;
};

export function GatewayEventListener(event: keyof ClientEvents | "raw") {
    return (
        originalMethodOrTarget: unknown,
        contextOrMethodName: string | ClassMethodDecoratorContext,
        descriptor?: PropertyDescriptor
    ) => {
        if (typeof contextOrMethodName === "string") {
            const metadata =
                Reflect.getMetadata("event_listeners", originalMethodOrTarget as object) ?? [];

            metadata.push({
                event,
                handler: descriptor!.value,
                methodName: contextOrMethodName
            });

            Reflect.defineMetadata("event_listeners", metadata, originalMethodOrTarget as object);
        } else {
            const methodName = String(contextOrMethodName.name);
            const eventListeners =
                (contextOrMethodName.metadata?.eventListeners as EventListenerInfo[]) ?? [];

            eventListeners.push({
                event,
                methodName
            });

            (contextOrMethodName.metadata as unknown) ??= {};
            contextOrMethodName.metadata.eventListeners = eventListeners;
            return originalMethodOrTarget as void;
        }
    };
}
