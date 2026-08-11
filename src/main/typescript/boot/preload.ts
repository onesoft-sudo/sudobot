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

import "reflect-metadata";
import "./loadenv.js";

import { Module } from "module";
import path from "path";

let _moduleAliases: Record<string, string> = {};
const isTypeScript = import.meta.filename.endsWith(".ts");

function resolveFilename(name: string) {
    for (const alias in _moduleAliases) {
        if (name.startsWith(alias)) {
            const resolved = path.join(
                import.meta.dirname,
                "../../../../",
                isTypeScript ? "." : "..",
                _moduleAliases[alias],
                name.replace(alias, "")
            );

            return resolved;
        }
    }

    return null;
}

if (!("__preloaded" in global)) {
    (global as { isBundle?: boolean }).isBundle ??= false;

    if (isTypeScript || global.isBundle) {
        _moduleAliases = (
            await import("../../../../package.json", {
                with: { type: "json" }
            })
        ).default._moduleAliases;
    } else {
        _moduleAliases = (
            await import(String("../../../../../package.json"), {
                with: { type: "json" }
            })
        ).default._moduleAliases;
    }

    if (typeof Module.registerHooks === "function") {
        Module.registerHooks({
            resolve: (specifier, context, nextResolve) => {
                const resolved = resolveFilename(specifier);
                return nextResolve(resolved ?? specifier, context);
            }
        });
    } else {
        const originalResolveFilename = (
            Module.Module as unknown as Record<string, unknown>
        )._resolveFilename as (
            request: unknown,
            parent: unknown,
            isMain: unknown,
            options: unknown
        ) => unknown;
        Object.defineProperty(Module.Module, "_resolveFilename", {
            value: (
                request: unknown,
                parent: unknown,
                isMain: unknown,
                options: unknown
            ) => {
                const resolved = resolveFilename(`${request}`);
                return (
                    resolved ??
                    originalResolveFilename(request, parent, isMain, options)
                );
            }
        });
    }

    Object.defineProperty(global, "__preloaded", { value: true });
}
