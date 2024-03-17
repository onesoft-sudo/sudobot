import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            reportsDirectory: "coverage",
            include: ["src"]
        },
        dir: "tests",
        exclude: ["**/node_modules/**", "**/build/**", "**/extensions/**"],
        setupFiles: ["./tests/setup.ts"]
    },
    plugins: [],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src")
        }
    }
});
