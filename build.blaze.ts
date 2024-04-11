import "@blazebuild/globals";

import { typescript } from "@blazebuild/plugins/typescript";
import BuildTask from "@buildSrc/tasks/BuildTask";
import LintTask from "@buildSrc/tasks/LintTask";
import RunTask from "@buildSrc/tasks/RunTask";
import TestTask from "@buildSrc/tasks/TestTask";

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

repositories(() => {
    npmMain();
});

dependencies(() => {
    requiredModule("@google/generative-ai", "^0.3.0");
    requiredModule("@prisma/client", "^5.11.0");
    requiredModule("@tensorflow/tfjs-node", "^4.17.0");
    requiredModule("archiver", "^7.0.1");
    requiredModule("ascii-table3", "^0.8.2");
    requiredModule("async-mutex", "^0.4.0");
    requiredModule("axios", "^1.6.7");
    requiredModule("bcrypt", "^5.1.1");
    requiredModule("bufferutil", "^4.0.8");
    requiredModule("canvas", "^2.11.2");
    requiredModule("chalk", "^4.1.2");
    requiredModule("cors", "^2.8.5");
    requiredModule("date-fns", "^2.30.0");
    requiredModule("deepmerge", "^4.3.1");
    requiredModule("discord.js", "^14.14.1");
    requiredModule("dot-object", "^2.1.4");
    requiredModule("dotenv", "^16.3.1");
    requiredModule("express", "^4.18.2");
    requiredModule("express-rate-limit", "^6.9.0");
    requiredModule("figlet", "^1.7.0");
    requiredModule("googleapis", "^126.0.1");
    requiredModule("jpeg-js", "^0.4.4");
    requiredModule("json5", "^2.2.3");
    requiredModule("jsonwebtoken", "^9.0.1");
    requiredModule("module-alias", "^2.2.3");
    requiredModule("nsfwjs", "^3.0.0");
    requiredModule("pm2", "^5.3.1");
    requiredModule("reflect-metadata", "^0.1.13");
    requiredModule("semver", "^7.5.4");
    requiredModule("sharp", "^0.33.2");
    requiredModule("socket.io", "^4.7.2");
    requiredModule("tar", "^6.2.1");
    requiredModule("tesseract.js", "^5.0.4");
    requiredModule("tslib", "^2.6.2");
    requiredModule("undici", "^5.23.0");
    requiredModule("utf-8-validate", "^5.0.10");
    requiredModule("uuid", "^9.0.0");
    requiredModule("zlib-sync", "^0.1.9");
    requiredModule("zod", "^3.21.4");

    devModule("@commitlint/cli", "^17.6.6");
    devModule("@commitlint/config-conventional", "^17.6.6");
    devModule("@faker-js/faker", "^8.4.1");
    devModule("@onesoftnet/pm2-config", "^0.0.7");
    devModule("@types/archiver", "^6.0.2");
    devModule("@types/bcrypt", "^5.0.0");
    devModule("@types/bun", "latest");
    devModule("@types/cors", "^2.8.13");
    devModule("@types/dot-object", "^2.1.2");
    devModule("@types/express", "^4.17.17");
    devModule("@types/figlet", "^1.5.8");
    devModule("@types/jsonwebtoken", "^9.0.2");
    devModule("@types/module-alias", "^2.0.2");
    devModule("@types/node", "^20.4.0");
    devModule("@types/semver", "^7.5.4");
    devModule("@types/tar", "^6.1.11");
    devModule("@types/uuid", "^9.0.2");
    devModule("@typescript-eslint/eslint-plugin", "^7.1.1");
    devModule("@typescript-eslint/parser", "^7.1.1");
    devModule("@vitest/coverage-v8", "^1.3.1");
    devModule("eslint", "^8.57.0");
    devModule("husky", "latest");
    devModule("prisma", "^5.11.0");
    devModule("typescript", "^5.4.3");
    devModule("vitest", "^1.3.1");
    devModule("zod-to-json-schema", "^3.22.5");
    devModule("prettier", "^3.2.5");
    devModule("blazebuild", "file:./blazebuild");

    optionalModule("openai", "^4.26.0");
});

tasks.register(BuildTask);
tasks.register(TestTask);
tasks.register(RunTask);
tasks.register(LintTask);

tasks.register("afterDependencies", async () => {
    await x("prisma generate");
});
