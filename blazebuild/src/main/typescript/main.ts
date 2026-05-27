#!/usr/bin/env node

import "reflect-metadata";

import chalk from "chalk";
import { existsSync } from "fs";
import { lstat, readFile, writeFile } from "fs/promises";
import path, { basename } from "path";
import { parseArgs } from "util";
import BlazeBuild from "./core/BlazeBuild.ts";

import { chmod, mkdir } from "fs/promises";
import { chdir } from "process";
import { x } from "./utils/helpers.ts";
import { createInterface } from "readline/promises";
import { execSync } from "child_process";

import Module from "module";

let buildScriptLastModifiedTime = 0;
let settingsScriptLastModifiedTime = 0;

if (process.env.BLAZEW_INTERNAL_ARGV0) {
    process.chdir(path.dirname(process.env.BLAZEW_INTERNAL_ARGV0));
}

async function loadBuildScript() {
    const buildScriptTsPath = "build.blaze.ts";
    const buildScriptMtsPath = "build.blaze.mts";
    const buildScriptJsPath = "build.blaze.js";
    let buildScriptPath: string;

    if (existsSync(buildScriptTsPath)) {
        buildScriptPath = buildScriptTsPath;
    } else if (existsSync(buildScriptMtsPath)) {
        buildScriptPath = buildScriptMtsPath;
    } else if (existsSync(buildScriptJsPath)) {
        buildScriptPath = buildScriptJsPath;
    } else {
        throw new Error(
            "No build script found. Please create a build.blaze.{ts,mts,js} file."
        );
    }

    await import(new URL("file://" + path.resolve(buildScriptPath)).toString());
    const buildScriptStats = await lstat(buildScriptPath);
    buildScriptLastModifiedTime = buildScriptStats.mtimeMs;
}

async function loadSettingsScript() {
    const settingsScriptTsPath = "settings.blaze.ts";
    const settingsScriptMtsPath = "settings.blaze.mts";
    const settingsScriptJsPath = "settings.blaze.js";
    let settingsScriptPath: string;

    if (existsSync(settingsScriptTsPath)) {
        settingsScriptPath = settingsScriptTsPath;
    } else if (existsSync(settingsScriptMtsPath)) {
        settingsScriptPath = settingsScriptMtsPath;
    } else if (existsSync(settingsScriptJsPath)) {
        settingsScriptPath = settingsScriptJsPath;
    } else {
        throw new Error(
            "No settings script found. Please create a settings.blaze.{ts,mts,js} file."
        );
    }

    await import(
        new URL("file://" + path.resolve(settingsScriptPath)).toString()
    );
    const settingsScriptStats = await lstat(settingsScriptPath);
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

    const packageManagers = ["pnpm", "yarn", "npm", "bun"];
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
    using rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    console.log(
        `${chalk.blue("==>")} ${chalk.whiteBright.bold("Creating a new BlazeBuild project...")}`
    );
    let name = "";

    for (;;) {
        process.stdout.write("Enter project name: ");
        const line = await rl.question("Enter project name: ");

        name = line.trim();

        if (name === "") {
            console.error("Project name cannot be empty.");
            continue;
        }

        break;
    }

    console.log(
        `${chalk.blue("==>")} ${chalk.whiteBright.bold("Creating directory: ${chalk.cyan(name)}")}`
    );
    await mkdir(name);
    chdir(name);

    console.log(
        `${chalk.blue("==>")} ${chalk.whiteBright.bold("Creating project files...")}`
    );

    const templateDir = path.resolve(__dirname, "../../../templates");
    const blazewTemplate = path.resolve(templateDir, "blazew.txt");
    const blazewPs1Template = path.resolve(
        templateDir,
        "../../../templates/blazew.ps1.template"
    );
    const buildBlazeScriptTemplate = path.resolve(
        templateDir,
        "../../../templates/build.blaze.mts.template"
    );
    const packageJsonTemplate = path.resolve(
        templateDir,
        "../../../templates/package.json.template"
    );
    const settingsBlazeScriptTemplate = path.resolve(
        templateDir,
        "../../../templates/settings.blaze.mts.template"
    );

    await writeFile("package.json", packageJsonTemplate, "utf8");
    await writeFile("build.blaze.mts", buildBlazeScriptTemplate, "utf8");
    await writeFile("settings.blaze.mts", settingsBlazeScriptTemplate, "utf8");
    await writeFile("blazew", blazewTemplate, "utf8");
    await writeFile("blazew.ps1", blazewPs1Template, "utf8");

    await chmod("blazew", 0o755);
    await chmod("blazew.ps1", 0o755);

    await mkdir("blaze/wrapper", { recursive: true });
    await writeFile(
        "blaze/wrapper/blaze_wrapper.properties",
        `node.version=${process.versions.node}\n`,
        "utf8"
    );

    await mkdir("src/main/typescript", { recursive: true });
    await writeFile(
        "src/main/typescript/index.ts",
        `console.log("Hello world!");\n`,
        "utf8"
    );

    console.log(
        `${chalk.blue("==>")} ${chalk.whiteBright.bold("Installing initial dependencies...")}`
    );

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

    await x(`${pm} install`);
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

    if (existsSync("build_src")) {
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

        console.log(
            `${chalk.blue("==>")} ${chalk.whiteBright.bold("Building build_src...")}`
        );

        if (!existsSync("build_src/node_modules")) {
            execSync(`${pm} install -D`, {
                cwd: path.join(process.cwd(), "build_src"),
                stdio: "inherit"
            });
        }

        execSync(`${pm} run build`, {
            cwd: path.join(process.cwd(), "build_src"),
            stdio: "inherit"
        });

        console.log(
            `${chalk.blue("==>")} ${chalk.whiteBright.bold("Built build_src")}`
        );
    }

    if (existsSync("package.json")) {
        const { _moduleAliases } = JSON.parse(
            await readFile("package.json", "utf8")
        );

        function resolveFilename(name: string) {
            for (const alias in _moduleAliases) {
                if (name.startsWith(alias)) {
                    const base = path.join(
                        _moduleAliases[alias as keyof typeof _moduleAliases],
                        name.slice(alias.length + (name !== alias ? 1 : 0)) +
                            ("." +
                                ("isBun" in process && process.isBun
                                    ? "ts"
                                    : "js"))
                    );

                    if (process.platform === "win32") {
                        return new URL(
                            "file://" + path.resolve(base)
                        ).toString();
                    }

                    return path.resolve(base);
                }
            }

            return null;
        }

        if (typeof Module.registerHooks !== "undefined") {
            Module.registerHooks({
                resolve: (specifier, context, nextResolve) => {
                    const resolved = resolveFilename(specifier);
                    return nextResolve(resolved ?? specifier, context);
                }
            });
        } else {
            const originalResolveFilename = (
                Module as unknown as Record<string, unknown>
            )._resolveFilename as (
                request: unknown,
                parent: unknown,
                isMain: unknown,
                options: unknown
            ) => unknown;
            Object.defineProperty(Module, "_resolveFilename", {
                value: (
                    request: unknown,
                    parent: unknown,
                    isMain: unknown,
                    options: unknown
                ) => {
                    const resolved = resolveFilename(`${request}`);
                    return (
                        resolved ??
                        originalResolveFilename(
                            request,
                            parent,
                            isMain,
                            options
                        )
                    );
                }
            });
        }
    }

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
