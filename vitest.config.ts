import { readFileSync } from "fs";
import path from "path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            reportsDirectory: "coverage",
            include: ["src"],
            exclude: ["src/tests"]
        },
        dir: "src/tests/typescript",
        exclude: ["**/node_modules/**", "**/build/**", "**/extensions/**"],
        setupFiles: ["./src/tests/typescript/setup.ts"],
        typecheck: {
            enabled: true,
            tsconfig: "./src/tests/tsconfig.json"
        },
        env: {
            SUDOBOT_PREFIX: process.platform === "win32" ? undefined : "/tmp"
        }
    },
    plugins: [
        swc.vite({
            ...JSON.parse(readFileSync(path.resolve(import.meta.dirname, ".swcrc"), "utf-8"))
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src/main/typescript"),
            "@framework": path.resolve(import.meta.dirname, "./src/framework/typescript"),
            "@main": path.resolve(import.meta.dirname, "./src/main/typescript"),
            "@api": path.resolve(import.meta.dirname, "./src/api/typescript"),
            "@schemas": path.resolve(import.meta.dirname, "./src/schemas/typescript"),
            "@tests": path.resolve(import.meta.dirname, "./src/tests/typescript")
        }
    }
});
