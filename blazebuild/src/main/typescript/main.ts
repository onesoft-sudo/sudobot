#!/usr/bin/env bun

import "reflect-metadata";

import chalk from "chalk";
import { existsSync } from "fs";
import { lstat, writeFile } from "fs/promises";
import path, { basename } from "path";
import { parseArgs } from "util";
import BlazeBuild from "./core/BlazeBuild";

import { $ } from "bun";
import { chmod, mkdir } from "fs/promises";
import { chdir } from "process";
import blazewPs1Template from "../../../templates/blazew.ps1.template" with { type: "text" };
import blazewScriptTemplate from "../../../templates/blazew.template" with { type: "text" };
import buildBlazeScriptTemplate from "../../../templates/build.blaze.ts.template" with { type: "text" };
import packageJsonTemplate from "../../../templates/package.json.template" with { type: "text" };
import settingsBlazeScriptTemplate from "../../../templates/settings.blaze.ts.template" with { type: "text" };

let buildScriptLastModifiedTime = 0;
let settingsScriptLastModifiedTime = 0;

async function loadBuildScript() {
    const buildScriptTsPath = path.resolve(process.cwd(), "build.blaze.ts");
    const buildScriptJsPath = path.resolve(process.cwd(), "build.blaze.js");

    if (existsSync(buildScriptTsPath)) {
        await import(buildScriptTsPath, {
            with: {
                type: "module"
            }
        });
    } else if (existsSync(buildScriptJsPath)) {
        await import(buildScriptJsPath, {
            with: {
                type: "module"
            }
        });
    } else {
        throw new Error(
            "No build script found. Please create a build.blaze.{ts,js} file."
        );
    }

    const buildScriptStats = await lstat(
        buildScriptTsPath || buildScriptJsPath
    );
    buildScriptLastModifiedTime = buildScriptStats.mtimeMs;
}

async function loadSettingsScript() {
    const settingsScriptTsPath = path.resolve(
        process.cwd(),
        "settings.blaze.ts"
    );
    const settingsScriptJsPath = path.resolve(
        process.cwd(),
        "settings.blaze.js"
    );

    if (existsSync(settingsScriptTsPath)) {
        await import(settingsScriptTsPath, {
            with: {
                type: "module"
            }
        });
    } else if (existsSync(settingsScriptJsPath)) {
        await import(settingsScriptJsPath, {
            with: {
                type: "module"
            }
        });
    } else {
        throw new Error(
            "No settings script found. Please create a settings.blaze.{ts,js} file."
        );
    }

    const settingsScriptStats = await lstat(
        settingsScriptTsPath || settingsScriptJsPath
    );

    settingsScriptLastModifiedTime = settingsScriptStats.mtimeMs;
}

function showHelp() {
    console.log(
        chalk.blueBright.bold(
            "BlazeBuild - A blazing fast build system for JavaScript and TypeScript."
        )
    );
    console.log();
    console.log(chalk.whiteBright.bold("Usage:"));
    console.log(
        "  %s [options] <tasks...>",
        process.env.BLAZEW_INTERNAL_ARGV0 ?? basename(process.argv[1])
    );
    console.log();
    console.log(chalk.whiteBright.bold("Options:"));
    console.log("  -h, --help     Show this help message");
    console.log("  -v, --version  Show the version number");
    console.log("  -N, --new      Create a new project");
    console.log("  -G, --graph    Show the dependency graph");
    process.exit(0);
}

function showVersion() {
    console.log("BlazeBuild %s", BlazeBuild.version);
    console.log("License: GPL-3.0-or-later");
    console.log("Copyright (C) 2024-2025 OSN Developers.");
    console.log(
        "This is free software: you are free to change and redistribute it."
    );
    console.log("There is NO WARRANTY, to the extent permitted by law.");
    process.exit(0);
}

function parseArguments() {
    try {
        const { values, positionals } = parseArgs({
            options: {
                help: {
                    type: "boolean",
                    short: "h",
                    default: false
                },
                version: {
                    type: "boolean",
                    short: "v",
                    default: false
                },
                graph: {
                    type: "boolean",
                    default: false,
                    short: "G"
                },
                new: {
                    type: "boolean",
                    default: false,
                    short: "N"
                }
            },
            args: process.argv.slice(2),
            strict: true,
            allowPositionals: true
        });

        if (values.help) {
            showHelp();
        }

        if (values.version) {
            showVersion();
        }

        return {
            options: values,
            positionals
        };
    } catch (error) {
        if (error instanceof TypeError && "code" in error) {
            switch (error.code) {
                case "ERR_PARSE_ARGS_UNKNOWN_OPTION":
                    console.error(`Unknown option: ${error.message}`);
                    break;
                case "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL":
                    console.error(
                        `Unexpected positional argument: ${error.message}`
                    );
                    break;
                case "ERR_PARSE_ARGS_UNEXPECTED_OPTION":
                    console.error(`Unexpected option: ${error.message}`);
                    break;
                default:
                    console.error(`Unknown error: ${error.message}`);
                    break;
            }
        } else {
            throw error;
        }

        process.exit(1);
    }
}

function detectPackageManager() {
    const pm = process.env.BLAZE_PACKAGE_MANAGER;

    if (pm) {
        return pm;
    }

    const packageManagers = ["bun", "pnpm", "yarn", "npm"];
    const PATH = process.env.PATH?.split(path.delimiter) ?? [];

    for (const pm of packageManagers) {
        for (const dir of PATH) {
            const pmPath = path.join(dir, pm);

            if (existsSync(pmPath)) {
                return pm;
            }
        }
    }

    return null;
}

async function createNewProject() {
    console.log(`${chalk.blue("==>")} Creating a new BlazeBuild project...`);

    process.stdout.write("Enter project name: ");
    let name = "";

    for await (const line of console) {
        name = line.trim();

        if (name === "") {
            console.error("Project name cannot be empty.");
            process.stdout.write("Enter project name: ");
            continue;
        }

        break;
    }

    console.log(`${chalk.blue("==>")} Creating directory: ${chalk.cyan(name)}`);
    await mkdir(name);
    chdir(name);

    console.log(`${chalk.blue("==>")} Creating project files...`);

    await writeFile("package.json", packageJsonTemplate, "utf8");
    await writeFile("build.blaze.ts", buildBlazeScriptTemplate, "utf8");
    await writeFile("settings.blaze.ts", settingsBlazeScriptTemplate, "utf8");
    await writeFile("blazew", blazewScriptTemplate, "utf8");
    await writeFile("blazew.ps1", blazewPs1Template, "utf8");

    await chmod("blazew", 0o755);
    await chmod("blazew.ps1", 0o755);

    await mkdir("blaze/wrapper", { recursive: true });
    await writeFile(
        "blaze/wrapper/blaze_wrapper.properties",
        `node.version=${process.versions.node}\nbun.version=${process.versions.bun}\n`,
        "utf8"
    );

    await mkdir("src/main/typescript", { recursive: true });
    await writeFile(
        "src/main/typescript/index.ts",
        `console.log("Hello world!");\n`,
        "utf8"
    );

    console.log(`${chalk.blue("==>")} Installing initial dependencies...`);

    const pm = detectPackageManager();

    if (!pm) {
        console.error(
            `No package manager found. Please install one of the following: npm, yarn, pnpm, or bun.`
        );
        console.error(
            `Alternatively, you can set the BLAZE_PACKAGE_MANAGER environment variable to the path of your package manager.`
        );

        process.exit(1);
    }

    const result = await $`${pm} install`;

    if (result.exitCode !== 0) {
        console.error(`Failed to install dependencies.`);

        process.exit(1);
    }

    console.log(chalk.green("Project created successfully!"));
    chdir("..");
}

async function main() {
    const { positionals, options } = parseArguments();

    if (options.new) {
        await createNewProject();
        process.exit(0);
    }

    const blaze = new BlazeBuild(options);

    if (positionals.length === 0) {
        console.error("No task specified. Please specify a task to run.");
        process.exit(1);
    }

    Object.defineProperty(globalThis, "__blazebuild", {
        value: blaze,
        writable: false,
        configurable: false,
        enumerable: false
    });

    await loadSettingsScript();
    await loadBuildScript();

    await blaze.initialize(
        settingsScriptLastModifiedTime,
        buildScriptLastModifiedTime
    );

    if (blaze.taskManager.unregisteredTasks.size > 0) {
        blaze.logger.warning("Unregistered tasks found:");

        for (const error of blaze.taskManager.unregisteredTasks.values()) {
            console.warn(error.modifiedStack);
        }
    }

    await blaze.execute(positionals);
}

main().then();
