import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            reportsDirectory: "coverage",
            include: ["src"]
        },
        dir: "tests",
        exclude: ["**/node_modules/**", "**/build/**", "**/extensions/**"]
    },
    plugins: []
});
