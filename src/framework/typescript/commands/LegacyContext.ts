import type {
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
    InteractionEditReplyOptions,
    Message
} from "discord.js";
import CommandContextType from "./CommandContextType";
import Context, { type ContextReplyOptions } from "./Context";
import { requireNonNull } from "@framework/utils/utils";

class LegacyContext extends Context<CommandContextType.Legacy> {
    public override readonly type = CommandContextType.Legacy;
    public readonly commandMessage: ChatInputCommandInteraction | ContextMenuCommandInteraction;

    public constructor(commandMessage: ChatInputCommandInteraction | ContextMenuCommandInteraction) {
        super();
        this.commandMessage = commandMessage;
    }

    public override async reply(options: ContextReplyOptions): Promise<Message<boolean>> {
        if (this.commandMessage.deferred) {
            return this.commandMessage.editReply(options as InteractionEditReplyOptions);
        }

        const response = await this.commandMessage.reply({ withResponse: true });
        return requireNonNull(response.resource?.message);
    }
}

export default LegacyContext;
