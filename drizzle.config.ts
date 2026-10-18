import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { readdirSync } from "fs";
import path from "path";

export default defineConfig({
    dialect: "postgresql",
    out: "./drizzle",
    schema: readdirSync(path.resolve(__dirname, "src/main/typescript/models")).map((file: string) =>
        path.resolve(__dirname, "src/main/typescript/models", file)
    ),
    dbCredentials: {
        url: process.env.SUDOBOT_DATABASE_URL!
    },
    verbose: true,
    strict: true
});
