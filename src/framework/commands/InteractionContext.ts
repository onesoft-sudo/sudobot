import {
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
    MessageContextMenuCommandInteraction,
    User
} from "discord.js";
import Context from "./Context";
import { ContextType } from "./ContextType";

class InteractionContext<
    T extends ChatInputCommandInteraction | ContextMenuCommandInteraction =
        | ChatInputCommandInteraction
        | ContextMenuCommandInteraction
> extends Context<T> {
    public override readonly type;

    constructor(commandName: string, commandMessage: T) {
        super(commandName, commandMessage);

        this.type =
            commandMessage instanceof ChatInputCommandInteraction
                ? ContextType.ChatInput
                : commandMessage instanceof MessageContextMenuCommandInteraction
                ? ContextType.MessageContextMenu
                : ContextType.UserContextMenu;
    }

    public override get userId(): string {
        return this.commandMessage.user.id;
    }

    public override get user(): User {
        return this.commandMessage.user;
    }
}

export default InteractionContext;
