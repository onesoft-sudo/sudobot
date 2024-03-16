import {
    ApplicationCommandType,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    ContextMenuCommandInteraction,
    Message,
    PermissionResolvable,
    SlashCommandBuilder
} from "discord.js";
import Client from "../../core/Client";
import Argument from "../arguments/Argument";
import Builder from "../types/Builder";
import Context from "./Context";
import { ContextType } from "./ContextType";
import InteractionContext from "./InteractionContext";
import LegacyContext from "./LegacyContext";

export type CommandMessage =
    | Message<true>
    | ChatInputCommandInteraction
    | ContextMenuCommandInteraction;
export type ChatContext = LegacyContext | InteractionContext<ChatInputCommandInteraction>;
export type CommandBuilders = Array<SlashCommandBuilder | ContextMenuCommandBuilder>;

export type SubcommandMeta = {
    description: string;
    detailedDescription?: string;
    syntaxes?: string[];
    options?: Record<string, string>;
    beta?: boolean;
    since?: string;
    permissions?: PermissionResolvable[];
    systemPermissions?: PermissionResolvable[];
};

/**
 * Represents an abstract command.
 * @template T - The type of context the command supports.
 */
abstract class Command<T extends ContextType = ContextType> implements Builder<CommandBuilders> {
    /**
     * The name of the command.
     */
    public abstract readonly name: string;

    /**
     * The group of the command.
     */
    public group!: string;

    /**
     * The description of the command.
     */
    public abstract readonly description: string;

    /**
     * The detailed description of the command.
     */
    public readonly detailedDescription?: string;

    /**
     * The aliases of the command.
     */
    public readonly aliases: string[] = [];

    /**
     * The supported contexts of the command.
     */
    public readonly supportedContexts: T[] = [ContextType.Legacy, ContextType.ChatInput] as T[];

    /**
     * Whether the command should be deferred.
     */
    public readonly defer: boolean = false;

    /**
     * Whether the command should be ephemeral.
     */
    public readonly ephemeral: boolean = false;

    /**
     * Options for the command. The keys are the options without dashes at the beginning, and
     * the values are the description of the option.
     */
    public readonly options: Record<string, string> = {};

    /**
     * The subcommands of the command.
     */
    public readonly subcommands: string[] = [];

    /**
     * The metadata for the subcommands of the command.
     */
    public readonly subcommandMeta: Record<string, SubcommandMeta> = {};

    /**
     * The version of the bot when this command was introduced.
     */
    public readonly since: string = "1.0.0";

    /**
     * Whether the command is in beta.
     */
    public readonly beta: boolean = false;

    /**
     * The cooldown of the command in milliseconds.
     */
    public readonly cooldown?: number;

    /**
     * The required permissions for the member running this command.
     */
    public readonly permissions?: PermissionResolvable[];

    /**
     * The required permissions for the bot system to run this command.
     */
    public readonly systemPermissions?: PermissionResolvable[];

    /**
     * Creates a new instance of the Command class.
     * @param client - The client instance.
     */
    public constructor(protected readonly client: Client) {}

    /**
     * Checks if the command supports legacy context.
     * @returns True if the command supports legacy context, false otherwise.
     */
    public supportsLegacy(): this is Command<ContextType.Legacy> {
        return this.supportedContexts.includes(ContextType.Legacy as T);
    }

    /**
     * Checks if the command supports chat input context.
     * @returns True if the command supports chat input context, false otherwise.
     */
    public supportsChatInput(): this is Command<ContextType.ChatInput> {
        return this.supportedContexts.includes(ContextType.ChatInput as T);
    }

    /**
     * Checks if the command supports message context menu.
     * @returns True if the command supports message context menu, false otherwise.
     */
    public supportsMessageContextMenu(): this is Command<ContextType.MessageContextMenu> {
        return this.supportedContexts.includes(ContextType.MessageContextMenu as T);
    }

    /**
     * Checks if the command supports user context menu.
     * @returns True if the command supports user context menu, false otherwise.
     */
    public supportsUserContextMenu(): this is Command<ContextType.UserContextMenu> {
        return this.supportedContexts.includes(ContextType.UserContextMenu as T);
    }

    /**
     * Checks if the command supports any context menu.
     * @returns True if the command supports any context menu, false otherwise.
     */
    public supportsContextMenu(): this is Command<
        ContextType.MessageContextMenu | ContextType.UserContextMenu
    > {
        return this.supportsMessageContextMenu() || this.supportsUserContextMenu();
    }

    /**
     * Builds the command data.
     * @returns An array of command builders.
     */
    public build() {
        const data: Array<SlashCommandBuilder | ContextMenuCommandBuilder> = [];

        if (this.supportsMessageContextMenu()) {
            data.push(
                new ContextMenuCommandBuilder()
                    .setName(this.name)
                    .setDMPermission(false)
                    .setType(ApplicationCommandType.Message)
            );
        }

        if (this.supportsUserContextMenu()) {
            data.push(
                new ContextMenuCommandBuilder()
                    .setName(this.name)
                    .setDMPermission(false)
                    .setType(ApplicationCommandType.User)
            );
        }

        if (this.supportsChatInput()) {
            data.push(
                new SlashCommandBuilder()
                    .setName(this.name)
                    .setDescription(this.description)
                    .setDMPermission(false)
            );
        }

        return data;
    }

    /**
     * Executes the actual command logic.
     * @param context - The command context.
     * @param args - The command arguments.
     */
    public abstract execute(context: Context, ...args: ArgumentPayload): Promise<void>;

    /**
     * Prepares and begins to execute the command.
     * @param context - The command context.
     * @param args - The command arguments.
     */
    public async run(context: Context, args: ArgumentPayload) {
        if (this.defer) {
            await context.defer({ ephemeral: this.ephemeral });
        }

        await this.execute(context, ...args);
    }
}

export type Arguments = Record<string | number, unknown>;
export type ArgumentPayload = Array<Argument<unknown> | null> | [Arguments];

export { Command };
