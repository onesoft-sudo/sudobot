import type { Awaitable } from "discord.js";
import CommandContextType from "./CommandContextType";
import type Context from "./Context";
import { CommandMode } from "./CommandMode";

abstract class Command<C extends CommandContextType = CommandContextType> {
    /**
     * The name of this command.
     *
     * @type {string}
     */
    public abstract readonly name: string;

    /**
     * The group which this command belongs to.
     * This is automatically initialized by the command manager.
     */
    public readonly group: string = "Ungrouped";

    /**
     * Alias names of this command.
     */
    public readonly aliases: string[] = [];

    /**
     * List of supported contexts, where this command can run.
     *
     * @type {C[]}
     */
    public readonly contexts: C[] = [CommandContextType.Legacy, CommandContextType.Interactive] as C[];

    /**
     * List of supported modes, in which this command can run.
     *
     * @type {CommandMode[]}
     */
    public readonly modes: CommandMode[] = [CommandMode.Direct, CommandMode.Guild];

    /**
     * Executes the command logic.
     *
     * @param context The command control context.
     * @param args Arguments passed to this command.
     * @param options Short and long (GNU style) options passed to this command.
     */
    protected abstract execute(
        context: Context,
        args: readonly unknown[],
        options: Readonly<Record<string, string>>
    ): Awaitable<void>;

    /**
     * Runs early during application boot.
     */
    public onAppBoot?(): Awaitable<void>;

    /**
     * Starts execution of this command.
     */
    public async run(context: Context): Promise<void> {
        await context.reply("Hello world");
    }
}

export default Command;
