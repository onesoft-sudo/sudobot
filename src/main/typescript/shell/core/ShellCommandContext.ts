/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import type { StringLike } from "@framework/types/StringLike";
import ExitError from "@main/shell/core/ExitError";
import EventEmitter from "events";
import type { WebSocket } from "ws";

class ShellCommandContext extends EventEmitter {
    public readonly elevatedPrivileges: boolean;
    public readonly args: readonly string[];
    public readonly ws: WebSocket;
    private _stdout: string = "";
    private _stderr: string = "";

    public constructor(
        ws: WebSocket,
        args: readonly string[] = [],
        elevatedPrivileges: boolean = false
    ) {
        super();
        this.ws = ws;
        this.args = args;
        this.elevatedPrivileges = elevatedPrivileges;
    }

    private _print(arg: StringLike, fd: "stdout" | "stderr" = "stdout"): string {
        const string = `${arg}`;

        if (fd === "stderr") {
            this._stderr += string;
        } else {
            this._stdout += string;
        }

        return string;
    }

    public print(arg: StringLike, fd: "stdout" | "stderr" = "stdout"): void {
        const string = this._print(arg, fd);
        this.emit(fd, string);
    }

    public println(arg: StringLike, fd: "stdout" | "stderr" = "stdout"): void {
        const string = this._print(arg, fd);

        if (fd === "stderr") {
            this._stderr += "\n";
        } else {
            this._stdout += "\n";
        }

        this.emit(fd, string + "\n");
    }

    public exit(code: number): never {
        this.emit("exit", code);
        throw new ExitError().setCode(code);
    }

    public get stdout(): string {
        return this._stdout;
    }

    public get stderr(): string {
        return this._stderr;
    }
}

export { ShellCommandContext };
