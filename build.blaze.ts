import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";
import { Task } from "blazebuild/src/decorators/Task";
import { File } from "blazebuild/src/io/File";
import { typescript } from "blazebuild/src/plugins/typescript";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import "./.blaze/build.d.ts";

project.name = "sudobot";
project.description = "A Discord bot for moderation purposes.";
project.version = "9.0.0-alpha.1";
project.srcDir = "src";
project.buildDir = "build";
project.testsDir = "tests";
project.author = {
    name: "Ar Rakin",
    email: "rakinar2@onesoftnet.eu.org",
    url: "https://virtual-designer.github.io"
};

packageManager("npm");

plugins(({ add }) => {
    add([typescript]);
});

class BuildTask extends AbstractTask {
    public override readonly name = "build";

    private async resultIO() {
        await this.addInputsByGlob(`${project.srcDir}/**/*.ts`);
        await this.addOutputsByGlob(
            this.inputs.map(input =>
                File.of(input)
                    .path.replace(project.srcDir, project.buildDir)
                    .replace(/\.ts$/, ".js")
            )
        );
    }

    @Caching(CachingMode.Incremental)
    @Task({ name: "compileTypeScript", noPrefix: true })
    public async compileTypeScript(): Promise<void> {
        await typescript.compile();
        await this.resultIO();
    }

    @Caching(CachingMode.Incremental)
    @Task({ name: "compile", noPrefix: true })
    @Dependencies("compileTypeScript")
    public async compile(): Promise<void> {
        await this.resultIO();
    }

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies", "compile", "test")
    public override async execute() {
        const tmpBuildDir = path.resolve(`${project.buildDir}/../_build.tmp`);
        const targetDir = `${project.buildDir}/src`;

        if (existsSync(tmpBuildDir)) {
            await fs.rm(tmpBuildDir, { recursive: true, force: true });
        }

        await fs.rename(targetDir, tmpBuildDir);
        await fs.rm(project.buildDir, { recursive: true, force: true });
        await fs.rename(tmpBuildDir, project.buildDir);

        await this.resultIO();
        this.addOutputs(project.buildDir);
    }
}

class TestTask extends AbstractTask {
    public override readonly name = "test";

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies")
    public override async execute() {
        if (!project.testsDir) {
            throw new Error("No tests directory specified.");
        }

        await this.addInputsByGlob(`${project.testsDir}/**/*.ts`);
        await x("vitest --run");
    }
}

tasks.register(BuildTask);
tasks.register(TestTask);

tasks.register("afterDependencies", async () => {
    await x("prisma generate");
});

tasks.register(
    "lint",
    async () => {
        await x("eslint --ext .ts src  --max-warnings=0");
    },
    {
        dependencies: ["dependencies"]
    }
);

tasks.register(
    "run",
    () => {
        setTimeout(async () => {
            if (process.argv.includes("--node")) {
                await tasks.execute("build");
                spawnSync("node", [`${project.buildDir}/index.js`], { stdio: "inherit" });
            } else {
                spawnSync("bun", [`${project.srcDir}/bun.ts`], { stdio: "inherit" });
            }
        }, 1000);
    },
    {
        dependencies: ["metadata"]
    }
);

dependencies(() => {
    nodeModule("@google/generative-ai", "^0.3.0");
    nodeModule("@prisma/client", "^5.11.0");
    nodeModule("@tensorflow/tfjs-node", "^4.17.0");
    nodeModule("archiver", "^7.0.1");
    nodeModule("ascii-table3", "^0.8.2");
    nodeModule("async-mutex", "^0.4.0");
    nodeModule("axios", "^1.6.7");
    nodeModule("bcrypt", "^5.1.1");
    nodeModule("bufferutil", "^4.0.8");
    nodeModule("canvas", "^2.11.2");
    nodeModule("chalk", "^4.1.2");
    nodeModule("cors", "^2.8.5");
    nodeModule("date-fns", "^2.30.0");
    nodeModule("deepmerge", "^4.3.1");
    nodeModule("discord.js", "^14.14.1");
    nodeModule("dot-object", "^2.1.4");
    nodeModule("dotenv", "^16.3.1");
    nodeModule("express", "^4.18.2");
    nodeModule("express-rate-limit", "^6.9.0");
    nodeModule("figlet", "^1.7.0");
    nodeModule("googleapis", "^126.0.1");
    nodeModule("jpeg-js", "^0.4.4");
    nodeModule("json5", "^2.2.3");
    nodeModule("jsonwebtoken", "^9.0.1");
    nodeModule("module-alias", "^2.2.3");
    nodeModule("nsfwjs", "^3.0.0");
    nodeModule("pm2", "^5.3.1");
    nodeModule("reflect-metadata", "^0.1.13");
    nodeModule("semver", "^7.5.4");
    nodeModule("sharp", "^0.33.2");
    nodeModule("socket.io", "^4.7.2");
    nodeModule("tar", "^6.2.1");
    nodeModule("tesseract.js", "^5.0.4");
    nodeModule("tslib", "^2.6.2");
    nodeModule("undici", "^5.23.0");
    nodeModule("utf-8-validate", "^5.0.10");
    nodeModule("uuid", "^9.0.0");
    nodeModule("zlib-sync", "^0.1.9");
    nodeModule("zod", "^3.21.4");

    devNodeModule("@commitlint/cli", "^17.6.6");
    devNodeModule("@commitlint/config-conventional", "^17.6.6");
    devNodeModule("@faker-js/faker", "^8.4.1");
    devNodeModule("@onesoftnet/pm2-config", "^0.0.7");
    devNodeModule("@types/archiver", "^6.0.2");
    devNodeModule("@types/bcrypt", "^5.0.0");
    devNodeModule("@types/bun", "latest");
    devNodeModule("@types/cors", "^2.8.13");
    devNodeModule("@types/dot-object", "^2.1.2");
    devNodeModule("@types/express", "^4.17.17");
    devNodeModule("@types/figlet", "^1.5.8");
    devNodeModule("@types/jsonwebtoken", "^9.0.2");
    devNodeModule("@types/module-alias", "^2.0.2");
    devNodeModule("@types/node", "^20.4.0");
    devNodeModule("@types/semver", "^7.5.4");
    devNodeModule("@types/tar", "^6.1.11");
    devNodeModule("@types/uuid", "^9.0.2");
    devNodeModule("@typescript-eslint/eslint-plugin", "^7.1.1");
    devNodeModule("@typescript-eslint/parser", "^7.1.1");
    devNodeModule("@vitest/coverage-v8", "^1.3.1");
    devNodeModule("eslint", "^8.57.0");
    devNodeModule("husky", "latest");
    devNodeModule("prisma", "^5.11.0");
    devNodeModule("typescript", "^5.4.3");
    devNodeModule("vitest", "^1.3.1");
    devNodeModule("zod-to-json-schema", "^3.22.5");
    devNodeModule("blazebuild", "file:./build_src");

    optionalNodeModule("openai", "^4.26.0");
});
