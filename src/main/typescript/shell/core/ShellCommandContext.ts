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
