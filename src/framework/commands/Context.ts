import {
    Guild,
    GuildMember,
    GuildTextBasedChannel,
    InteractionDeferReplyOptions,
    InteractionReplyOptions,
    Message,
    MessageCreateOptions,
    Snowflake,
    User
} from "discord.js";
import Client from "../../core/Client";
import { emoji } from "../../utils/emoji";
import { CommandMessage } from "./Command";
import { ContextType } from "./ContextType";

abstract class Context<T extends CommandMessage = CommandMessage> {
    public readonly commandName: string;
    public readonly commandMessage: T;
    public abstract readonly type: ContextType;

    public get isLegacy() {
        return this.type === ContextType.Legacy;
    }

    public get isChatInput() {
        return this.type === ContextType.ChatInput;
    }

    public get isContextMenu() {
        return (
            this.type === ContextType.MessageContextMenu ||
            this.type === ContextType.UserContextMenu
        );
    }

    public get isMessageContextMenu() {
        return this.type === ContextType.MessageContextMenu;
    }

    public get isUserContextMenu() {
        return this.type === ContextType.UserContextMenu;
    }

    public get guildId(): Snowflake {
        return this.commandMessage.guildId!;
    }

    public get guild(): Guild {
        return this.commandMessage.guild!;
    }
    public get channelId(): Snowflake {
        return this.commandMessage.channelId!;
    }
    public get channel(): GuildTextBasedChannel {
        return this.commandMessage.channel! as GuildTextBasedChannel;
    }

    public get member(): GuildMember | null {
        return this.commandMessage.member as GuildMember | null;
    }

    public get memberId(): Snowflake | null {
        return this.member?.id ?? null;
    }

    abstract get userId(): Snowflake;
    abstract get user(): User;

    public constructor(commandName: string, commandMessage: T) {
        this.commandName = commandName;
        this.commandMessage = commandMessage;
    }

    public reply(options: Parameters<this["commandMessage"]["reply"]>[0]): Promise<Message> {
        const optionsToPass = options as unknown as MessageCreateOptions & InteractionReplyOptions;

        if (this.commandMessage instanceof Message) {
            return this.commandMessage.reply(optionsToPass);
        }

        if (this.commandMessage.deferred) {
            return this.commandMessage.editReply(optionsToPass);
        }

        return this.commandMessage.reply({
            ...optionsToPass,
            fetchReply: true
        });
    }

    public async defer(options?: InteractionDeferReplyOptions) {
        if (this.commandMessage instanceof Message) {
            return;
        }

        return this.commandMessage.deferReply(options);
    }

    public emoji(name: string) {
        return emoji(Client.instance, name);
    }

    public async error(options: Parameters<this["commandMessage"]["reply"]>[0]) {
        return this.reply(
            typeof options === "string"
                ? `${this.emoji("error")} ${options}`
                : {
                      ...(options as unknown as MessageCreateOptions & InteractionReplyOptions),
                      ephemeral: true,
                      content: `${this.emoji("error")} ${
                          (options as MessageCreateOptions).content ?? "An error has occurred."
                      }`
                  }
        );
    }

    public async success(options: Parameters<this["commandMessage"]["reply"]>[0]) {
        return this.reply(
            typeof options === "string"
                ? `${this.emoji("check")} ${options}`
                : {
                      ...(options as unknown as MessageCreateOptions & InteractionReplyOptions),
                      ephemeral: true,
                      content: `${this.emoji("check")} ${
                          (options as MessageCreateOptions).content ?? "Operation successful."
                      }`
                  }
        );
    }
}

export default Context;
