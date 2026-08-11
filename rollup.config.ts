import alias from "@rollup/plugin-alias";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import path from "path";
import { defineConfig } from "rollup";

const rootDirectory = import.meta.dirname;

export default defineConfig(() => ({
    input: path.resolve(rootDirectory, "src/main/typescript/bundle.ts"),
    output: {
        dir: path.resolve(rootDirectory, "build/out"),
        format: "esm" as const,
        sourcemap: true
    },
    treeshake: true,
    plugins: [
        typescript({
            tsconfig: path.resolve(rootDirectory, "tsconfig.json")
        }),
        json(),
        alias({
            entries: [
                {
                    find: /^@root\/(.*)/,
                    replacement: path.resolve(rootDirectory, "$1")
                }
            ]
        })
    ]
}));
