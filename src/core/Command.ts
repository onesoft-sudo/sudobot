import {
    APIEmbed,
    APIEmbedField,
    APIMessage,
    ApplicationCommandType,
    Awaitable,
    CacheType,
    Channel,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    ContextMenuCommandInteraction,
    GuildMember,
    InteractionDeferReplyOptions,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    Message,
    MessageCreateOptions,
    MessagePayload,
    ModalSubmitInteraction,
    PermissionResolvable,
    SlashCommandBuilder,
    TextBasedChannel,
    User
} from "discord.js";
import { ChatInputCommandContext, ContextMenuCommandContext, LegacyCommandContext } from "../services/CommandManager";
import EmbedSchemaParser from "../utils/EmbedSchemaParser";
import { channelInfo, guildInfo, userInfo } from "../utils/embed";
import { safeChannelFetch } from "../utils/fetch";
import { logError } from "../utils/logger";
import { getEmoji } from "../utils/utils";
import Client from "./Client";
import CommandArgumentParser from "./CommandArgumentParser";
import { ValidationRule } from "./CommandArgumentParserInterface";

export * from "./CommandArgumentParserInterface";

export type CommandMessage = Message<boolean> | ChatInputCommandInteraction<CacheType> | ContextMenuCommandInteraction;
export type BasicCommandContext = LegacyCommandContext | ChatInputCommandContext;
export type AnyCommandContext = BasicCommandContext | ContextMenuCommandContext;
export type CommandReturn =
    | ((MessageCreateOptions | APIMessage | InteractionReplyOptions) & { __reply?: boolean })
    | undefined
    | null
    | void;

type CommandSlashCommandBuilder =
    | Partial<Pick<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">>
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

type DeferReplyMode = "delete" | "channel" | "default" | "auto";
type DeferReplyOptions =
    | ((MessageCreateOptions | MessagePayload | InteractionEditReplyOptions) & { ephemeral?: boolean })
    | string;
type PermissionValidationResult =
    | boolean
    | {
          isPermitted: boolean;
          source?: string;
      };
export type RunCommandOptions = {
    message: CommandMessage;
    context: AnyCommandContext;
    onAbort?: () => unknown;
    checkOnly?: boolean;
};

export default abstract class Command {
    public readonly name: string = "";
    public group: string = "Default";
    public readonly aliases: string[] = [];

    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    public readonly permissions: PermissionResolvable[] = [];
    public readonly validationRules: readonly ValidationRule[] = [];
    public readonly permissionMode: "or" | "and" = "and";
    public readonly systemAdminOnly: boolean = false;

    public readonly description?: string;
    public readonly detailedDescription?: string;
    public readonly argumentSyntaxes?: string[];
    public readonly availableOptions?: Record<string, string>;
    public readonly beta: boolean = false;
    public readonly since: string = "1.0.0";
    public readonly botRequiredPermissions: PermissionResolvable[] = [];
    public readonly slashCommandBuilder?: CommandSlashCommandBuilder;

    public readonly applicationCommandType: ApplicationCommandType = ApplicationCommandType.ChatInput;
    public readonly otherApplicationCommandBuilders: (ContextMenuCommandBuilder | SlashCommandBuilder)[] = [];

    public readonly subcommands: string[] = [];
    public readonly subCommandCheck: boolean = false;
    public readonly cooldown?: number = undefined;

    protected message?: CommandMessage;

    protected static argumentParser = new CommandArgumentParser(Client.instance);

    protected constructor(protected client: Client<true>) {}

    abstract execute(message: CommandMessage, context: AnyCommandContext, options?: RunCommandOptions): Promise<CommandReturn>;

    protected getCommandMessage(): CommandMessage {
        if (!this.message) {
            throw new TypeError(`${this.constructor.name}.message is undefined`);
        }

        return this.message;
    }

    protected async deferIfInteraction(message: CommandMessage, options?: InteractionDeferReplyOptions) {
        if (message instanceof ChatInputCommandInteraction) return await message.deferReply(options).catch(logError);
    }

    public async deferredReply(message: CommandMessage, options: DeferReplyOptions, mode: DeferReplyMode = "default") {
        if (message instanceof ChatInputCommandInteraction || message instanceof ContextMenuCommandInteraction) {
            return message.deferred ? await message.editReply(options) : await message.reply(options as any);
        }

        const behaviour = this.client.configManager.config[message.guildId!]?.commands.moderation_command_behaviour;

        if (mode === "delete" || (mode === "auto" && behaviour === "delete")) {
            await message.delete().catch(logError);
        }

        return mode === "delete" || (mode === "auto" && behaviour === "delete") || mode === "channel"
            ? message.channel.send(options as any)
            : message.reply(options as any);
    }

    protected async error(message: CommandMessage, errorMessage?: string, mode: DeferReplyMode = "default") {
        return await this.deferredReply(
            message,
            errorMessage
                ? `${this.emoji("error")} ${errorMessage}`
                : `⚠️ An error has occurred while performing this action. Please make sure that the bot has the required permissions to perform this action.`,
            mode
        );
    }

    protected async success(message: CommandMessage, successMessage?: string, mode: DeferReplyMode = "default") {
        return await this.deferredReply(
            message,
            successMessage ? `${this.emoji("check")} ${successMessage}` : `Successfully completed the given task.`,
            mode
        );
    }

    protected sendError(errorMessage?: string, mode: DeferReplyMode = "default") {
        return this.error(this.getCommandMessage(), errorMessage, mode);
    }

    protected sendSuccess(successMessage?: string, mode: DeferReplyMode = "default") {
        return this.success(this.getCommandMessage(), successMessage, mode);
    }

    protected emoji(name: string) {
        return getEmoji(this.client, name);
    }

    protected async sendCommandRanLog(
        message: CommandMessage | ModalSubmitInteraction,
        options: APIEmbed,
        params: {
            fields?: (fields: APIEmbedField[]) => Awaitable<APIEmbedField[]>;
            before?: (channel: TextBasedChannel, sentMessages: Array<Message | null>) => any;
            previews?: Array<MessageCreateOptions | MessagePayload>;
            url?: string | null;
        } = {}
    ) {
        if (!this.client.configManager.systemConfig.logging?.enabled) {
            return;
        }

        const { previews = [] } = params;
        const logChannelId = this.client.configManager.systemConfig.logging?.channels?.echo_send_logs;

        if (!logChannelId) {
            return;
        }

        try {
            const channel = await safeChannelFetch(await this.client.getHomeGuild(), logChannelId);

            if (!channel?.isTextBased()) {
                return;
            }

            const sentMessages = [];

            for (const preview of previews) {
                const sentMessage = await EmbedSchemaParser.sendMessage(channel, {
                    ...preview,
                    reply: undefined
                } as MessageCreateOptions).catch(logError);
                sentMessages.push(sentMessage ?? null);
            }

            (await params.before?.(channel, sentMessages))?.catch?.(logError);

            const embedFields = [
                {
                    name: "Command Name",
                    value: this.name
                },
                {
                    name: "Guild Info",
                    value: guildInfo(message.guild!),
                    inline: true
                },
                {
                    name: "Channel Info",
                    value: channelInfo(message.channel as Channel),
                    inline: true
                },
                {
                    name: "User (Executor)",
                    value: userInfo(message.member!.user as User),
                    inline: true
                },
                {
                    name: "Mode",
                    value: message instanceof Message ? "Legacy" : "Application Interaction"
                },
                ...(params.url !== null
                    ? [
                          {
                              name: "Message URL",
                              value: params.url ?? (message instanceof Message ? message.url : "*Not available*")
                          }
                      ]
                    : [])
            ];

            await channel
                ?.send({
                    embeds: [
                        {
                            author: {
                                name: message.member?.user.username as string,
                                icon_url: (message.member?.user as User)?.displayAvatarURL()
                            },
                            title: "A command was executed",
                            color: 0x007bff,
                            fields: (await params.fields?.(embedFields)) ?? embedFields,
                            ...options
                        }
                    ]
                })
                .catch(logError);
        } catch (error) {
            logError(error);
        }
    }

    /**
     * Check for command cooldowns.
     *
     * @param message The target message
     * @returns {Promise<boolean>} Whether to abort the command
     */
    private async cooldownCheck(message: CommandMessage): Promise<boolean> {
        if (!this.cooldown) {
            return false;
        }

        const { cooldown, enabled } = this.client.cooldown.lock(message.guildId!, this.name, this.cooldown);

        if (enabled) {
            const seconds = Math.max(Math.ceil(((cooldown ?? 0) - Date.now()) / 1000), 1);

            await this.deferredReply(message, {
                embeds: [
                    {
                        description: `${this.emoji(
                            "clock_red"
                        )} You're being rate limited, please wait for **${seconds}** second${seconds === 1 ? "" : "s"}.`,
                        color: 0xf14a60
                    }
                ],
                ephemeral: true
            });

            return true;
        }

        return false;
    }

    protected async validateCommandBuiltInPermissions(member: GuildMember): Promise<boolean> {
        // TODO: Implement support for 'overwrite'
        if (this.client.configManager.systemConfig.default_permissions_mode === "ignore") {
            return true;
        }

        return !(
            (this.permissionMode === "and" && !member.permissions.has(this.permissions, true)) ||
            (this.permissionMode === "or" && !member.permissions.any(this.permissions, true))
        );
    }

    protected validatePermissions({ message }: RunCommandOptions): Awaitable<PermissionValidationResult> {
        // TODO
        return this.validateCommandBuiltInPermissions(message.member as GuildMember);
    }

    protected async doChecks(options: RunCommandOptions) {
        const { message } = options;
        const permissionValidationResult = await this.validatePermissions(options);
        const isPermitted =
            (typeof permissionValidationResult === "boolean" && permissionValidationResult) ||
            (typeof permissionValidationResult === "object" && permissionValidationResult.isPermitted);
        const permissionValidationFailureSource =
            (typeof permissionValidationResult === "object" && permissionValidationResult.source) || undefined;
        const debugMode =
            (this.client.configManager.systemConfig.debug_mode ||
                this.client.configManager.config[message.guildId!]?.debug_mode) ??
            false;

        if (!isPermitted) {
            await this.error(
                message,
                `You don't have permission to run this command.${
                    debugMode && permissionValidationFailureSource ? `\nSource: \`${permissionValidationFailureSource}\`` : ""
                }`
            );
            return false;
        }

        if (this.cooldown) {
            const abort = await this.cooldownCheck(message);

            if (abort) {
                return;
            }
        }

        return true;
    }

    protected async parseArguments({ message, context }: RunCommandOptions) {
        if (!(message instanceof Message) || !context.isLegacy) {
            return true;
        }

        const { error, parsedArgs } = await Command.argumentParser.parse({
            message,
            input: message.content,
            prefix: context.prefix,
            rules: this.validationRules
        });

        if (error) {
            await this.error(message, error);
            return false;
        }

        return parsedArgs;
    }

    async run(options: RunCommandOptions) {
        const { message, context, checkOnly = false, onAbort } = options;

        this.message = message;

        if (!(await this.doChecks(options))) {
            this.message = undefined;
            onAbort?.();
            return;
        }

        if (checkOnly) {
            this.message = undefined;
            return;
        }

        const parsedArgs = await this.parseArguments(options);

        if (parsedArgs === false) {
            return;
        }

        if (typeof parsedArgs === "object" && context.isLegacy) {
            context.parsedArgs = [];

            for (const key in parsedArgs) {
                context.parsedArgs[key as unknown as number] = parsedArgs[key];
            }

            context.parsedNamedArgs = parsedArgs;
        }

        const commandReturn = await this.execute(message, context);
        this.message = undefined;
        return commandReturn;
    }
}
