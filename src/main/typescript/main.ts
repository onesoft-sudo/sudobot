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

import "dotenv/config";
import "module-alias/register";
import "reflect-metadata";

import Application from "@framework/app/Application";
import { Logger } from "@framework/log/Logger";
import { isDevelopmentMode } from "@framework/utils/utils";
import AppKernel from "@main/core/AppKernel";
import { setEnvData } from "@main/env/env";
import { version } from "@root/package.json";
import type { DotenvParseOutput } from "dotenv";
import path from "path";

const logger = new Logger("preboot", true);

async function main() {
    if (isDevelopmentMode()) {
        Error.stackTraceLimit = Infinity;
    }

    Application.setupGlobals();

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

    const rootDirectoryPath = path.resolve(__dirname);
    const projectRootDirectoryPath = path.resolve(__dirname, "../../..");
    const application = new Application({
        rootDirectoryPath,
        projectRootDirectoryPath,
        version: process.env.SUDOBOT_VERSION ?? version
    });

    await application.run(new AppKernel());
}

export default main();
