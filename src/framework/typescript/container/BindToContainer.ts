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

import CanBind from "./CanBind";
import type { AnyConstructor, ContainerBindOptions as DIBindOptions } from "./Container";

type BindOptions<T extends AnyConstructor> = Omit<DIBindOptions<T>, "value" | "factory">;

export default function BindToContainer<T extends AnyConstructor>(options?: BindOptions<T>) {
    return (constructor: T, context?: ClassDecoratorContext<T>) => {
        CanBind(constructor, context);

        if (context) {
            (context.metadata as Record<string, string>) ??= {};
            context.metadata.bindToContainer = options?.key ?? null;
        } else {
            Reflect.defineMetadata("di:bind", { ...options, ref: constructor }, constructor);
        }

        return constructor;
    };
}
