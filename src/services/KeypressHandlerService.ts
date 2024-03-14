/**
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

import { spawnSync } from "node:child_process";
import { lstat } from "node:fs/promises";
import path from "node:path";
import { chdir, cwd } from "node:process";
import readline from "node:readline";
import { LogLevel, logError, logInfo, logWarn, logWithLevel } from "../components/log/Logger";
import Service from "../core/Service";
import { AnyFunction } from "../types/Utils";
import { developmentMode } from "../utils/utils";

export const name = "keypressHandler";

enum CommandKey {
    ReloadCommands = "R",
    ForceReloadCommands = "Shift+R",
    ReloadConfig = "L",
    WriteConfig = "Shift+L",
    Quit = "Q"
}

export default class KeypressHandlerService extends Service {
    readonly keyHandlers: Record<CommandKey, AnyFunction<[], unknown>> = {
        [CommandKey.ReloadCommands]: this.reloadCommands.bind(this),
        [CommandKey.ForceReloadCommands]: () => this.reloadCommands(true),
        [CommandKey.Quit]: this.quit.bind(this),
        [CommandKey.ReloadConfig]: this.reloadConfig.bind(this),
        [CommandKey.WriteConfig]: this.writeConfig.bind(this)
    };

    lastCommandUpdate = Date.now();

    onKeyPress = (
        _: string,
        key: {
            ctrl: boolean;
            meta: boolean;
            shift: boolean;
            name: string;
        }
    ) => {
        if (key.name.length !== 1) {
            return;
        }

        const modifiers: string[] = [];

        if (key.ctrl) modifiers.push("Ctrl");
        if (key.meta) modifiers.push("Meta");
        if (key.shift) modifiers.push("Shift");

        const commandKey = `${modifiers.join("+")}${
            modifiers.length > 0 ? "+" : ""
        }${key.name.toUpperCase()}`;
        const handler = this.keyHandlers[commandKey as CommandKey];

        if (handler) {
            handler();
            return;
        }

        if (key.ctrl && !key.meta && !key.shift && key.name === "c") {
            this.interrupt();
            return;
        }

        logWarn("Unrecognized command key: ", `${commandKey}`);
    };

    quit() {
        logWithLevel(LogLevel.Event, "Quit");
        process.exit(0);
    }

    interrupt() {
        logWithLevel(LogLevel.Event, "SIGINT signal received. Exiting");
        process.exit(1);
    }

    async reloadConfig() {
        await this.client.configManager.load();
        logWithLevel(LogLevel.Event, "Successfully reloaded configuration files");
    }

    async writeConfig() {
        await this.client.configManager.write({ guild: true, system: true });
        logWithLevel(LogLevel.Event, "Successfully saved configuration files to disk");
    }

    async reloadCommands(force = false) {
        const srcDir = process.env.SOURCE_DIRECTORY_PATH ?? path.resolve(__dirname, "../../src");
        const buildDir = process.env.BUILD_DIRECTORY_PATH ?? path.resolve(__dirname, "../../build");
        let built = false,
            failed = false;

        logWithLevel(LogLevel.Event, "Hot reloading commands");

        await this.client.dynamicLoader.loadCommands(undefined, true, async filePath => {
            if (failed) {
                return false;
            }

            if (force) {
                return true;
            }

            delete require.cache[require.resolve(filePath)];

            const sourceFile = filePath.replace(buildDir, srcDir).replace(/\.js$/gi, ".ts");
            const sourceInfo = await lstat(sourceFile);

            if (sourceInfo.mtime.getTime() < this.lastCommandUpdate) {
                return false;
            }

            if (!built && !__filename.endsWith(".ts")) {
                const currentDirectory = cwd();
                chdir(path.resolve(__dirname, "../.."));

                logInfo("Rebuilding project source files");

                const { status } = spawnSync("npm run build", {
                    encoding: "utf-8",
                    shell: true,
                    stdio: "inherit"
                });

                chdir(currentDirectory);

                if (status !== 0) {
                    failed = true;
                    return false;
                }

                built = true;
            }

            return true;
        });

        this.lastCommandUpdate = Date.now();

        if (failed) {
            logError("Build failed. Aborting hot reload");
        } else {
            logWithLevel(LogLevel.Event, "Successfully hot reloaded commands");
        }
    }

    override boot() {
        if (!developmentMode() || !process.stdin.isTTY) {
            return;
        }

        readline.emitKeypressEvents(process.stdin);
        process.stdin.on("keypress", this.onKeyPress);
        process.stdin.setRawMode(true);
    }

    override deactivate() {
        if (!developmentMode() || !process.stdin.isTTY) {
            return;
        }

        process.stdin.off("keypress", this.onKeyPress);
        process.stdin.setRawMode(false);
    }
}
