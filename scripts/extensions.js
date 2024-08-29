#!/usr/bin/env node

/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

require("module-alias/register");
require("dotenv/config");

const chalk = require("chalk");
const { spawnSync } = require("child_process");
const { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync, rmSync } = require("fs");
const { readFile, symlink, unlink } = require("fs/promises");
const path = require("path");
const { chdir, cwd } = require("process");
const { z } = require("zod");
const semver = require("semver");

const extensionsPath = process.env.EXTENSIONS_DIRECTORY ?? path.resolve(__dirname, "../extensions");

function error(...args) {
    console.error(...args);
    process.exit(-1);
}

if (!existsSync(extensionsPath)) {
    error(
        "You're not using any extension! To get started, create an `extensions` folder in the project root."
    );
}

function getRecuriveJavaScriptFiles(dir) {
    if (!existsSync(dir)) {
        return [];
    }

    const files = readdirSync(dir);
    const flat = [];

    for (const fileName of files) {
        const file = path.join(dir, fileName);
        const isDirectory = lstatSync(file).isDirectory();

        if (isDirectory) {
            flat.push(...getRecuriveJavaScriptFiles(file));
            continue;
        }

        if (!file.endsWith(".js")) {
            continue;
        }

        flat.push(file);
    }

    return flat;
}

const extensionMetadataSchema = z.object({
    main: z.string().optional(),
    commands: z.string().optional(),
    services: z.string().optional(),
    events: z.string().optional(),
    language: z.enum(["typescript", "javascript"]).optional(),
    main_directory: z.string().optional(),
    build_command: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    resources: z.string().optional(),
    id: z.string(),
    icon: z.string().optional(),
    readmeFileName: z.string().default("README.md")
});

function readMeta(extensionName, extensionDirectory) {
    const metadataFile = path.join(extensionDirectory, "extension.json");

    if (!existsSync(metadataFile)) {
        error(`Extension ${extensionName} does not have a "extension.json" file!`);
    }

    const metadata = JSON.parse(readFileSync(metadataFile, { encoding: "utf-8" }));

    try {
        return extensionMetadataSchema.parse(metadata);
    } catch (e) {
        error(`Extension ${extensionName} has an invalid "extension.json" file!`, e);
    }
}

async function writeCacheIndex() {
    const extensionsOutputArray = [];
    const meta = [];
    const extensions = readdirSync(extensionsPath);

    for await (const extensionName of extensions) {
        const extensionDirectory = path.resolve(extensionsPath, extensionName);
        const isDirectory = lstatSync(extensionDirectory).isDirectory();

        if (!isDirectory || extensionName === ".extbuilds") {
            continue;
        }

        console.log("Found extension: ", extensionName);

        const {
            main_directory = "./build",
            commands = `./${main_directory}/commands`,
            events = `./${main_directory}/events`,
            services = `./${main_directory}/services`,
            main = `./${main_directory}/index.js`,
            language = "typescript",
            id
        } = readMeta(extensionName, extensionDirectory);

        const extensionPath = path.join(extensionDirectory, main);

        const imported = await require(extensionPath);
        const { default: ExtensionClass } = imported.__esModule ? imported : { default: imported };
        const extension = new ExtensionClass(this.client);
        let commandPaths = await extension.commands();
        let eventPaths = await extension.events();
        let servicePaths = await extension.services();

        if (commandPaths === null) {
            const directory = path.join(
                ...(process.env.EXTENSIONS_DIRECTORY
                    ? [process.env.EXTENSIONS_DIRECTORY]
                    : [__dirname, "../extensions"]),
                extensionName,
                commands
            );

            if (existsSync(directory)) {
                commandPaths = getRecuriveJavaScriptFiles(directory);
            }
        }

        if (eventPaths === null) {
            const directory = path.join(
                ...(process.env.EXTENSIONS_DIRECTORY
                    ? [process.env.EXTENSIONS_DIRECTORY]
                    : [__dirname, "../extensions"]),
                extensionName,
                events
            );

            if (existsSync(directory)) {
                eventPaths = getRecuriveJavaScriptFiles(directory);
            }
        }

        if (servicePaths === null) {
            const directory = path.join(
                ...(process.env.EXTENSIONS_DIRECTORY
                    ? [process.env.EXTENSIONS_DIRECTORY]
                    : [__dirname, "../extensions"]),
                extensionName,
                services
            );

            if (existsSync(directory)) {
                servicePaths = getRecuriveJavaScriptFiles(directory);
            }
        }

        extensionsOutputArray.push({
            name: extensionName,
            entry: extensionPath,
            commands: commandPaths ?? [],
            events: eventPaths ?? [],
            services: servicePaths ?? [],
            id
        });

        meta.push({
            language
        });
    }

    console.log("Overview of the extensions: ");
    console.table(
        extensionsOutputArray.map((e, i) => ({
            name: e.name,
            entry: e.entry.replace(extensionsPath, "{ROOT}"),
            commands: e.commands.length,
            events: e.events.length,
            services: e.services.length,
            language: meta[i].language
        }))
    );

    const indexFile = path.join(extensionsPath, "index.json");

    writeFileSync(
        indexFile,
        JSON.stringify(
            {
                extensions: extensionsOutputArray
            },
            null,
            4
        )
    );

    console.log("Wrote cache index file: ", indexFile);
    console.warn(
        "Note: If you're getting import errors after caching extensions, please try first by removing or rebuilding them."
    );
}

const MAX_CHARS = 7;

function actionLog(action, description) {
    console.log(
        chalk.green.bold(
            `${action}${action.length >= MAX_CHARS ? "" : " ".repeat(MAX_CHARS - action.length)} `
        ),
        description
    );
}

function spawnSyncCatchExit(...args) {
    actionLog("RUN", args[0]);
    const { status } = spawnSync(...args);
    if (status !== 0) process.exit(status);
}

async function buildExtensions() {
    const startTime = Date.now();
    const extensions = readdirSync(extensionsPath);
    const workingDirectory = cwd();
    let count = 0;

    for await (const extensionName of extensions) {
        const extensionDirectory = path.resolve(extensionsPath, extensionName);
        const isDirectory = lstatSync(extensionDirectory).isDirectory();

        if (!isDirectory || extensionName === ".extbuilds") {
            continue;
        }

        chdir(path.join(extensionsPath, extensionName));

        if (!process.argv.includes("--tsc")) {
            actionLog("DEPS", extensionName);
            spawnSyncCatchExit("npm install -D", {
                encoding: "utf-8",
                shell: true,
                stdio: "inherit"
            });

            actionLog("RELINK", extensionName);
            spawnSyncCatchExit(
                `npm install --save ${path.relative(cwd(), path.resolve(__dirname, ".."))}`,
                {
                    encoding: "utf-8",
                    shell: true,
                    stdio: "inherit"
                }
            );
        }

        actionLog("PREPARE", extensionName);

        if (existsSync("tsconfig.json")) {
            await unlink("tsconfig.json").catch(() => {});
        }

        await symlink(
            `tsconfig.${process.env.BUN === "1" ? "bun" : "node"}.json`,
            "tsconfig.json"
        ).catch(() => {});

        actionLog("BUILD", extensionName);
        const { build_command } = readMeta(extensionName, extensionDirectory);

        if (!build_command) {
            console.log(chalk.cyan.bold("INFO "), "This extension doesn't require building.");
            continue;
        }

        spawnSyncCatchExit(build_command, {
            encoding: "utf-8",
            shell: true,
            stdio: "inherit"
        });

        count++;
    }

    actionLog(
        "SUCCESS",
        `in ${((Date.now() - startTime) / 1000).toFixed(2)}s, built ${count} extensions`
    );
    chdir(workingDirectory);
}

async function writeExtensionIndex() {
    const extensionsPath = path.resolve(__dirname, "../extensions");
    const extensionsOutputRecord = {};
    const extensions = readdirSync(extensionsPath);

    for await (const extensionName of extensions) {
        const extensionDirectory = path.resolve(extensionsPath, extensionName);
        const isDirectory = lstatSync(extensionDirectory).isDirectory();

        if (!isDirectory || extensionName === ".extbuilds") {
            continue;
        }

        console.log("Found extension: ", extensionName);

        const packageJsonPath = path.join(extensionDirectory, "package.json");
        const packageJson = JSON.parse(await readFile(packageJsonPath, { encoding: "utf-8" }));

        const {
            main_directory = "./build",
            commands = `./${main_directory}/commands`,
            events = `./${main_directory}/events`,
            build_command = null,
            name = packageJson.name ?? extensionName,
            description = packageJson.description,
            language = "javascript",
            main = `./${main_directory}/index.js`,
            services = `./${main_directory}/services`,
            id,
            icon,
            readmeFileName
        } = readMeta(extensionName, extensionDirectory) ?? {};

        const commandPaths = getRecuriveJavaScriptFiles(path.join(extensionDirectory, commands));
        const eventPaths = getRecuriveJavaScriptFiles(path.join(extensionDirectory, events));
        const servicePaths = getRecuriveJavaScriptFiles(path.join(extensionDirectory, services));

        const tarballs = readdirSync(path.resolve(extensionsPath, ".extbuilds", extensionName));

        tarballs.sort((a, b) => {
            const vA = path
                .basename(a)
                .replace(`${extensionName}-`, "")
                .replace(/\.tar\.gz$/gi, "");
            const vB = path
                .basename(b)
                .replace(`${extensionName}-`, "")
                .replace(/\.tar\.gz$/gi, "");
            const splitA = vA.split("-");
            const splitB = vB.split("-");
            const dashVA = splitA[1];
            const dashVB = splitB[1];
            const revA = isNaN(dashVA) ? 0 : parseInt(dashVA);
            const revB = isNaN(dashVB) ? 0 : parseInt(dashVB);
            const result = semver.rcompare(vA, vB);

            if (
                splitA[0] === splitB[0] &&
                vA.includes("-") &&
                !isNaN(dashVA) &&
                (!vB.includes("-") || isNaN(dashVB))
            ) {
                return -1;
            }

            if (
                splitA[0] === splitB[0] &&
                vB.includes("-") &&
                !isNaN(dashVB) &&
                (!vA.includes("-") || isNaN(dashVA))
            ) {
                return 1;
            }

            return result === 0 ? revB - revA : result;
        });

        const tarballList = tarballs.map(file => {
            const basename = path.basename(file);
            const filePath = path.join(extensionsPath, ".extbuilds", extensionName, basename);
            const { stdout } = spawnSync(`sha512sum`, [filePath], {
                encoding: "utf-8"
            });
            const { size, birthtime } = lstatSync(filePath);
            const checksum = stdout.split(" ")[0];

            return {
                url:
                    "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/extensions" +
                    path.join("/.extbuilds/", extensionName, basename),
                basename,
                version: basename.replace(`${extensionName}-`, "").replace(/\.tar\.gz$/gi, ""),
                checksum,
                size,
                createdAt: birthtime
            };
        });

        extensionsOutputRecord[id] = {
            name,
            id,
            shortName: packageJson.name ?? extensionName,
            description,
            version: packageJson.version,
            commands: commandPaths.length,
            events: eventPaths.length,
            buildCommand: build_command,
            language,
            services: servicePaths.length,
            main,
            iconURL: icon
                ? "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/extensions" +
                  path.join("/", extensionName, icon)
                : null,
            author:
                typeof packageJson.author === "string"
                    ? {
                          name: packageJson.author
                      }
                    : packageJson.author,
            license: packageJson.license,
            licenseURL: `https://spdx.org/licenses/${packageJson.license}.html`,
            homepage: packageJson.homepage,
            repository:
                typeof packageJson.repository === "string"
                    ? packageJson.repository
                    : packageJson.repository?.url,
            issues: typeof packageJson.bugs === "string" ? packageJson.bugs : packageJson.bugs?.url,
            lastUpdated: new Date(),
            readmeFileName: readmeFileName,
            readmeFileURL: `https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/extensions/${extensionName}/${readmeFileName}`,
            tarballs: tarballList
        };
    }

    console.log("Overview of the extensions: ");
    console.table(
        Object.values(extensionsOutputRecord).map(e => ({
            name: e.name,
            commands: e.commands.length,
            events: e.events.length
        }))
    );

    const indexFile = path.join(extensionsPath, ".extbuilds/index.json");

    writeFileSync(indexFile, JSON.stringify(extensionsOutputRecord, null, 4));

    console.log("Wrote index file: ", indexFile);
}

if (
    process.argv.includes("--clear-cache") ||
    process.argv.includes("--clean") ||
    process.argv.includes("--delcache")
) {
    const indexFile = path.join(extensionsPath, "index.json");

    if (!existsSync(indexFile)) {
        error("No cached index file found!");
    }

    rmSync(indexFile);
    console.log("Removed cached index file: ", indexFile);
} else if (process.argv.includes("--cache") || process.argv.includes("--index")) {
    console.time("Finished in");
    console.log("Creating cache index for all the installed extensions");
    writeCacheIndex()
        .then(() => console.timeEnd("Finished in"))
        .catch(e => {
            console.log(e);
            console.timeEnd("Finished in");
        });
} else if (process.argv.includes("--build")) {
    console.log("Building installed extensions");
    buildExtensions().catch(e => {
        console.log(e);
        process.exit(-1);
    });
} else if (process.argv.includes("--mkindex")) {
    console.log("Creating index for all the available extensions in the extensions/ directory");

    writeExtensionIndex().catch(e => {
        console.log(e);
        process.exit(-1);
    });
} else {
    console.log("Usage:");
    console.log("  node extensions.js <options>\n");
    console.log("Options:");
    console.log("  --build [--tsc]    |  Builds all the installed extensions, if needed.");
    console.log("                     |  The `--tsc` flag will only run the typescript compiler.");
    console.log(
        "  --cache            |  Creates cache indexes for installed extensions, to improve the startup time."
    );
    console.log("  --clean            |  Clears all installed extension cache.");
    console.log(
        "  --mkindex          |  Creates indexes for all the available extensions, in the extensions/ top level directory."
    );
    process.exit(-1);
}
