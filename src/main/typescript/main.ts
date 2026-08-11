/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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
import packageJSON from "@root/package.json" with { type: "json" };
import path from "path";

import { isDevelopmentMode } from "@framework/utils/utils.js";
import MasterProcessManager from "@main/sharding/MasterProcessManager.js";
import ShardProcessManager from "@main/sharding/ShardProcessManager.js";
import { parseArgs, type ParseArgsConfig } from "util";

const { _meta, version } = packageJSON;
const argv0 = process.env.SUDOBOT_WRAPPER
    ? "sudobot"
    : path.basename(process.argv[1]);

function usage() {
    console.info("Usage:");
    console.info(`  ${argv0} [OPTION]...`);
    console.info();
    console.info("Options:");
    console.info("  -h, --help                Show this help and exit.");
    console.info("  -v, --version             Show version information.");
    console.info("  -s, --shard=ID            Set shard ID for this process.");
    console.info(
        "                            Can be passed multiple times with"
    );
    console.info("                            different values.");
    console.info(
        "  -S, --shardcount=<COUNT>  Set total shard count. Required to be used"
    );
    console.info(
        "                            When the --shard option is used."
    );
    console.info(
        "  -M, --master              Become the master process, and spawn shards"
    );
    console.info("                            as needed.");
    console.info(
        "  -U, --update=[MODE]       Update application commands. MODE can be"
    );
    console.info("                            either 'local' or 'global'.");
}

function showVersion() {
    console.info(`SudoBot version ${version} (${_meta.release_codename})`);
    console.info(
        `Copyright (C) 2022-${new Date().getFullYear()} OSN Developers.`
    );
    console.info(
        "License AGPLv3.0+: This is free software. There is no warranty."
    );
}

type OptionValues = typeof values;

declare global {
    var optionValues: OptionValues;
}

const parseArgsOptions = {
    args: process.argv.slice(2),
    allowPositionals: false,
    strict: true,
    options: {
        shard: {
            short: "s",
            type: "string",
            multiple: true
        },
        shardcount: {
            short: "S",
            type: "string"
        },
        update: {
            short: "U",
            type: "string"
        },
        help: {
            short: "h",
            type: "boolean"
        },
        version: {
            short: "v",
            type: "boolean"
        },
        master: {
            short: "M",
            type: "boolean"
        }
    }
} satisfies ParseArgsConfig;

let values: ReturnType<typeof parseArgs<typeof parseArgsOptions>>["values"];

try {
    const result = parseArgs(parseArgsOptions);
    values = result.values;
} catch (error) {
    if (error instanceof TypeError && "code" in error) {
        switch (error.code) {
            case "ERR_PARSE_ARGS_UNKNOWN_OPTION":
                console.error(`${argv0}: unknown option: ${error.message}`);
                break;

            case "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL":
                console.error(
                    `${argv0}: unexpected positional argument: ${error.message}`
                );
                break;

            case "ERR_PARSE_ARGS_UNEXPECTED_OPTION":
                console.error(`${argv0}: unexpected option: ${error.message}`);
                break;

            default:
                console.error(`${argv0}: error: ${error.message}`);

                break;
        }
    } else {
        throw error;
    }

    process.exit(-1);
}

globalThis.optionValues = values;

async function main() {
    if (isDevelopmentMode()) {
        Error.stackTraceLimit = Infinity;
    }

    if (values.help) {
        usage();
        process.exit(0);
    }

    if (values.version) {
        showVersion();
        process.exit(0);
    }

    const shards = new Set<number>();

    if (values.shard?.length) {
        if (values.master) {
            console.error(
                `${argv0}: Cannot use --shard (-S) with --master (-M)`
            );
            process.exit(1);
        }

        for (const shard of values.shard) {
            if (!shard || Number.isNaN(+shard)) {
                console.error(`${argv0}: Invalid shard ID: ${shard}`);
                process.exit(1);
            }

            shards.add(+shard);
        }
    }

    let shardCount: number | undefined = undefined;

    if (typeof values.shardcount === "string") {
        shardCount = +values.shardcount;

        if (Number.isNaN(shardCount) || shardCount <= 0) {
            console.error(`${argv0}: Invalid shard count: ${shardCount}`);
            process.exit(1);
        }
    }

    if (values.master && shardCount === undefined) {
        console.error(
            `${argv0}: Please use --shardcount (-S) with --master (-M)`
        );
        process.exit(1);
    }

    if (
        !values.master &&
        ((shards.size > 0 && !shardCount) || (shards.size <= 0 && shardCount))
    ) {
        console.error(
            `${argv0}: Please use both --shard (-s) and --shardcount (-S) together`
        );
        process.exit(1);
    }

    if (
        values.update &&
        values.update !== "local" &&
        values.update !== "global"
    ) {
        console.error(
            `${argv0}: Option --update (-U) only accepts either 'local' or 'global' as argument`
        );
        process.exit(1);
    }

    if (values.master) {
        const masterProcessManager = new MasterProcessManager(process.argv);
        await masterProcessManager.start(shardCount);
    } else {
        const shardProcessManager = new ShardProcessManager();
        await shardProcessManager.start(shards, shardCount);
    }
}

export default main();
