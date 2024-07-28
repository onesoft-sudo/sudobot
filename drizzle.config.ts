require("dotenv/config");
const { readdirSync } = require("fs");
const path = require("path");

try {
    const { defineConfig } = require("drizzle-kit");

    module.exports = defineConfig({
        dialect: "postgresql",
        out: "./drizzle",
        schema: readdirSync(path.resolve(__dirname, "src/main/typescript/models")).map(
            (file: string) => path.resolve(__dirname, "src/main/typescript/models", file)
        ),
        dbCredentials: {
            url: process.env.DB_URL
        },
        // Print all statements
        verbose: true,
        // Always ask for confirmation
        strict: true
    });
} catch (error) {
    console.error(error);
}
