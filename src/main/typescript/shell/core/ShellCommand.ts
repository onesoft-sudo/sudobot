import type Application from "@framework/app/Application";
import type { ShellCommandContext } from "@main/shell/core/ShellCommandContext";
import type { Awaitable } from "discord.js";

abstract class ShellCommand {
    public abstract readonly name: string;
    public readonly aliases: string[] = [];

    public constructor(protected readonly application: Application) {}

    public usage?(context: ShellCommandContext) : Awaitable<void>;
    public abstract execute(context: ShellCommandContext): Awaitable<void>;
}

export default ShellCommand;
