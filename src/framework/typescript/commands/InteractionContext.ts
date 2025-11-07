import type {
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    Message
} from "discord.js";
import CommandContextType from "./CommandContextType";
import Context, { type ContextReplyOptions } from "./Context";
import { requireNonNull } from "@framework/utils/utils";
import type Application from "@framework/app/Application";

class InteractionContext extends Context<CommandContextType.Interactive> {
    public override readonly type = CommandContextType.Interactive;
    public override readonly commandMessage: ChatInputCommandInteraction | ContextMenuCommandInteraction;
    public override readonly commandName: string;

    public constructor(
        application: Application,
        commandMessage: ChatInputCommandInteraction | ContextMenuCommandInteraction
    ) {
        super(application);
        this.commandMessage = commandMessage;
        this.commandName = commandMessage.commandName;
    }

    public override async reply(options: ContextReplyOptions): Promise<Message<boolean>> {
        if (this.commandMessage.deferred) {
            return this.commandMessage.editReply(options as InteractionEditReplyOptions);
        }

        const response = await this.commandMessage.reply(
            typeof options === "string"
                ? { content: options, withResponse: true }
                : ({ ...options, withResponse: true } as InteractionReplyOptions & { withResponse: true })
        );

        return requireNonNull(response.resource?.message);
    }
}

export default InteractionContext;
