import "dotenv/config";
import { readdir } from "fs/promises";
import path from "path";

try {
    const { defineConfig } = await import(String("drizzle-kit"));

    module.exports = defineConfig({
        dialect: "postgresql",
        out: "./drizzle",
        schema: (await readdir(path.resolve(__dirname, "src/main/typescript/models"))).map((file: string) =>
            path.resolve(__dirname, "src/main/typescript/models", file)
        ),
        dbCredentials: {
            url: process.env.SUDOBOT_DB_URL
        },
        verbose: true,
        strict: true
    });
}
catch (error) {
    console.error(error);
}
