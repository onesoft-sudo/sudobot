import "reflect-metadata";

import dotenv from "dotenv";
import path from "path";
import { _moduleAliases } from "../../../package.json";
import { addAliases } from "module-alias";

if (!("__preloaded" in global)) {
    (global as { isBundle?: boolean }).isBundle ??= false;
    addAliases(_moduleAliases);
    dotenv.config({
        path: isBundle ? path.join(process.cwd(), ".env") : undefined,
        quiet: true
    });

    Object.defineProperty(global, "__preloaded", { value: true });
}
