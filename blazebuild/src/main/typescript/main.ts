import chalk from "chalk";
import { basename } from "path";
import { parseArgs } from "util";
import pkgjson from "../../../package.json" with { type: "json" };
import { Build } from "./core/Build.js";

const { version } = pkgjson;

function showHelp() {
    console.log(chalk.blueBright.bold("BlazeBuild - A blazing fast build system for JavaScript and TypeScript."));
    console.log();
    console.log(chalk.whiteBright.bold("Usage:"));
    console.log("  %s [options] <tasks...>", process.env.BLAZEW_INTERNAL_ARGV0 ?? basename(process.argv[1]));
    console.log();
    console.log(chalk.whiteBright.bold("Options:"));
    console.log("  -h, --help     Show this help message");
    console.log("  -v, --version  Show the version number");
    console.log("  -N, --new      Create a new project");
    console.log("  -G, --graph    Show the dependency graph");
    process.exit(0);
}

function showVersion() {
    console.log("BlazeBuild %s", version);
    console.log("License: GPL-3.0-or-later");
    console.log("Copyright (C) 2024-2025 OSN Developers.");
    console.log("This is free software: you are free to change and redistribute it.");
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
                    console.error(`Unexpected positional argument: ${error.message}`);
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

async function main() {
    const { options, positionals } = parseArguments();

    if (options.new) {
        console.error("New project creation is not implemented yet");
        process.exit(1);
    }

    const build = new Build(options);
    build.setup();
    await build.execute(positionals);
}

main().then();
