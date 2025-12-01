import "dotenv/config";
import { readdirSync } from "fs";
import path from "path";

try {
    const { defineConfig } = require(String("drizzle-kit"));

    module.exports = defineConfig({
        dialect: "postgresql",
        out: "./drizzle",
        schema: (readdirSync(path.resolve(__dirname, "src/main/typescript/models"))).map((file: string) =>
            path.resolve(__dirname, "src/main/typescript/models", file)
        ),
        dbCredentials: {
            url: process.env.SUDOBOT_DATABASE_URL
        },
        verbose: true,
        strict: true
    });
}
catch (error) {
    console.error(error);
}
