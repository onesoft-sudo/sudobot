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

import dotenv from "dotenv";
import path from "path";
import { _moduleAliases } from "../../../package.json";

// eslint-disable-next-line @typescript-eslint/no-require-imports
import Module = require("module");

function resolveFilename(name: string) {
    for (const alias in _moduleAliases) {
        if (name.startsWith(alias)) {
            return path.resolve(__dirname, "../../../", _moduleAliases[alias as keyof typeof _moduleAliases], name);
        }
    }

    return null;
}

if (!("__preloaded" in global)) {
    (global as { isBundle?: boolean }).isBundle ??= false;

    if (typeof Module.registerHooks !== "undefined") {
        Module.registerHooks({
            resolve: (specifier, context, nextResolve) => {
                const resolved = resolveFilename(specifier);
                return nextResolve(resolved ?? specifier, context);
            }
        });
    }
    else {
        const originalResolveFilename = (Module as unknown as Record<string, unknown>)._resolveFilename as (
            request: unknown,
            parent: unknown,
            isMain: unknown,
            options: unknown
        ) => unknown;
        Object.defineProperty(Module, "_resolveFilename", {
            value: (request: unknown, parent: unknown, isMain: unknown, options: unknown) => {
                const resolved = resolveFilename(`${request}`);
                return resolved ?? originalResolveFilename(request, parent, isMain, options);
            }
        });
    }

    dotenv.config({
        path: isBundle ? path.join(process.cwd(), ".env") : undefined,
        quiet: true
    });

    Object.defineProperty(global, "__preloaded", { value: true });
}
