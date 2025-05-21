import { tasks } from "blazebuild";
import { $ } from "bun";
import { cp, mkdir } from "fs/promises";
import { glob } from "glob";

tasks
    .define("compileTypeScript")
    .description("Compile TypeScript sources")
    .inputFiles(await glob("src/**/*.ts"))
    .outputFiles(await glob("build/out/**/*.ts"))
    .dependsOn("dependencies")
    .handler(async () => {
        await mkdir("build/out", { recursive: true });
        const { exitCode } = { exitCode: 0 }; //await $`tsc`;

        if (exitCode !== 0) {
            console.error("TypeScript compilation failed");
            process.exit(exitCode);
        }
    });

tasks
    .define("compile")
    .description("Compile the project")
    .dependsOn("compileTypeScript", "dependencies");

tasks
    .define("test")
    .description("Test the project")
    .dependsOn("compile")
    .inputFiles(await glob("src/**/*.ts"))
    .handler(async () => {
        const { exitCode } = await $`node_modules/.bin/vitest --run`;

        if (exitCode !== 0) {
            console.error("Tests failed");
            process.exit(exitCode);
        }
    });

tasks
    .define("lint")
    .description("Lint the project")
    .dependsOn("compile")
    .inputFiles(await glob("src/**/*.ts"))
    .handler(async () => {
        const { exitCode } = await $`node_modules/.bin/eslint src --ext .ts`;

        if (exitCode !== 0) {
            console.error("Linting failed");
            process.exit(exitCode);
        }
    });

tasks
    .define("dependencies")
    .description("Install dependencies")
    .inputFiles(["package.json"])
    .outputFiles(["node_modules"])
    .handler(async () => {
        const isPnpmAvailable =
            process.env.PATH?.split(":").some(path => path.includes("pnpm")) ||
            false;

        const { exitCode } =
            await $`${isPnpmAvailable ? "pnpm" : "bun"} install`;

        if (exitCode !== 0) {
            console.error("Dependency installation failed");
            process.exit(exitCode);
        }
    });

tasks
    .define("copyResources")
    .description("Copy resources")
    .handler(async () => {
        const sourcesRootDirectory = "src";
        const buildOutputDirectory = "build";

        const modules = ["main", "framework"];

        for (const module of modules) {
            await cp(
                `${sourcesRootDirectory}/${module}/resources`,
                `${buildOutputDirectory}/out/${module}/resources`,
                {
                    recursive: true
                }
            );
        }
    });

tasks
    .define("migrate")
    .description("Run database migrations")
    .inputFiles(["drizzle/*.sql"])
    .handler(async () => {
        if (!process.env.DB_URL) {
            console.error("DB_URL environment variable is not set");
            process.exit(1);
        }

        const { drizzle } = await import(String("drizzle-orm/node-postgres"));
        const { migrate } = await import(
            String("drizzle-orm/node-postgres/migrator")
        );
        const { Pool } = await import(String("pg"));

        const pool = new Pool({
            connectionString: process.env.DB_URL
        });

        const db = drizzle(pool);
        await migrate(db, { migrationsFolder: "drizzle" });
        await pool.end();
    });

tasks
    .define("build")
    .inputFiles(["src", ...(await glob("src/**/*.ts"))])
    .outputFiles(["build", ...(await glob("build/out/**/*.ts"))])
    .description("Build the project")
    .dependsOn("compile", "lint", "test");
