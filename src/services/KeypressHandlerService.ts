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

import readline from "node:readline";
import Service from "../core/Service";
import { LogLevel, logWarn, logWithLevel } from "../utils/logger";
import { developmentMode } from "../utils/utils";

export const name = "keypressHandler";

enum CommandKey {
    ReloadCommands = "r",
    Quit = "q"
}

export default class KeypressHandlerService extends Service {
    readonly keyHandlers: Record<CommandKey, Function> = {
        [CommandKey.ReloadCommands]: this.reloadCommands.bind(this),
        [CommandKey.Quit]: this.quit.bind(this)
    };

    onKeyPress = (
        character: CommandKey,
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

        const handler = this.keyHandlers[character];

        if (handler) {
            handler();
            return;
        }

        if (key.ctrl && !key.meta && !key.shift && key.name === "c") {
            this.interrupt();
            return;
        }

        const modifiers: string[] = [];

        if (key.ctrl) modifiers.push("Ctrl");
        if (key.meta) modifiers.push("Meta");
        if (key.shift) modifiers.push("Shift");

        logWarn(
            "Unrecognized command key: ",
            `${modifiers.join("+")}${modifiers.length > 0 ? "+" : ""}${key.name.toUpperCase()}`
        );
    };

    quit() {
        logWithLevel(LogLevel.EVENT, "Quit");
        process.exit(0);
    }

    interrupt() {
        logWithLevel(LogLevel.EVENT, "SIGINT signal received. Exiting");
        process.exit(1);
    }

    async reloadCommands() {
        logWithLevel(LogLevel.EVENT, "Hot reloading commands");
        await this.client.loadCommands();
        logWithLevel(LogLevel.EVENT, "Successfully hot reloaded commands");
    }

    override boot() {
        if (!developmentMode()) {
            return;
        }

        readline.emitKeypressEvents(process.stdin);
        process.stdin.on("keypress", this.onKeyPress);
        process.stdin.setRawMode(true);
    }

    override deactivate() {
        if (!developmentMode()) {
            return;
        }

        process.stdin.off("keypress", this.onKeyPress);
        process.stdin.setRawMode(false);
    }
}
