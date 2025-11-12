import path from "path";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

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
        }
    },
    plugins: [swc.vite()],
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
