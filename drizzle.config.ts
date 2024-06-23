import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { readdirSync } from "fs";
import path from "path";

export default defineConfig({
    dialect: "postgresql",
    out: "./drizzle",
    schema: readdirSync(path.resolve(__dirname, "src/main/typescript/models")).map(file =>
        path.resolve(__dirname, "src/main/typescript/models", file)
    ),
    dbCredentials: {
        url: process.env.DB_URL
    },
    // Print all statements
    verbose: true,
    // Always ask for confirmation
    strict: true
});
