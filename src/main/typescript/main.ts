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

import "./preload";

import path from "path";
import { _meta, version } from "../../../package.json";

import Application from "@main/core/Application";
import { Logger } from "@framework/log/Logger";
import { isDevelopmentMode } from "@framework/utils/utils";
import AppKernel from "@main/core/AppKernel";
import { setEnvData } from "@main/env/env";
import type { DotenvParseOutput } from "dotenv";
import { parseArgs } from "util";
import Resource from "@framework/resources/Resource";

const logger = new Logger("Main", true);
const argv0 = process.env.SUDOBOT_WRAPPER ? "sudobot" : path.basename(process.argv[1]);

async function loadEnvironmentData() {
    if (process.send) {
        await new Promise<void>((resolve, reject) => {
            process.once("message", message => {
                const messageData =
                    message && typeof message === "object"
                        ? (message as {
                              type: string;
                              data?: unknown;
                          })
                        : null;

                if (messageData?.type === "SECRETS") {
                    const data = messageData?.data as DotenvParseOutput;

                    if (!data) {
                        process.send?.({ type: "SECRETS_ACK" });
                        resolve();
                        return;
                    }

                    setEnvData({
                        ...process.env,
                        ...data
                    } as unknown as Record<string, string | undefined>);

                    for (const key in data) {
                        process.env[key] = data[key];
                    }

                    logger.success("Successfully loaded environment data");
                    process.send?.({ type: "SECRETS_ACK" });
                    resolve();
                    return;
                }

                reject(new Error("Invalid IPC message received"));
            });

            process.send?.({ type: "READY" });
        });
    }
}

function usage() {
    console.info("Usage:");
    console.info(`  ${argv0} [OPTION]...`);
    console.info();
    console.info("Options:");
    console.info("  -h, --help                Show this help and exit.");
    console.info("  -v, --version             Show version information.");
    console.info("  -s, --shard=ID            Set shard ID for this process.");
    console.info("                            Can be passed multiple times with");
    console.info("                            different values.");
    console.info("  -S, --shardcount=<COUNT>  Set total shard count. Required to be used");
    console.info("                            When the --shard option is used.");
    console.info("  -U, --update=[MODE]       Update application commands. MODE can be");
    console.info("                            either 'local' or 'global'.");
}

function showVersion() {
    console.info(`SudoBot version ${version} (${_meta.release_codename})`);
    console.info("Copyright (C) 2022-2025 OSN Developers.");
}

type OptionValues = typeof values;

declare global {
    var optionValues: OptionValues;
}

const { values } = parseArgs({
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
        }
    }
});

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

    if (values.shard) {
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

    if ((shards.size > 0 && !shardCount) || (shards.size <= 0 && shardCount)) {
        console.error(`${argv0}: Please use both --shard (-s) and --shardcount (-S) together`);
        process.exit(1);
    }

    if (values.update && values.update !== "local" && values.update !== "global") {
        console.error(`${argv0}: Option --update (-U) only accepts either 'local' or 'global' as argument`);
        process.exit(1);
    }

    Application.setupGlobals();
    Resource.registerResourcePaths(path.resolve(__dirname, "../resources"));
    await loadEnvironmentData();

    const rootDirectoryPath = path.resolve(__dirname);
    const projectRootDirectoryPath = path.resolve(__dirname, "../../..");
    const application = new Application({
        rootDirectoryPath,
        projectRootDirectoryPath,
        version: process.env.SUDOBOT_VERSION ?? version,
        shards: shards.size === 0 ? undefined : Array.from(shards),
        shardCount: shards.size === 0 ? undefined : shardCount
    });

    await application.run(
        new AppKernel({
            shards: shards.size === 0 ? undefined : Array.from(shards),
            shardCount: shards.size === 0 ? undefined : shardCount
        })
    );
}

export default main();
