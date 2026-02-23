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
