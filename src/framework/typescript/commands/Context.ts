import type { InteractionEditReplyOptions, InteractionReplyOptions, Message, MessageCreateOptions } from "discord.js";
import type CommandContextType from "./CommandContextType";

export type ContextReplyOptions = InteractionReplyOptions | InteractionEditReplyOptions | MessageCreateOptions | string;

abstract class Context<T extends CommandContextType = CommandContextType> {
    public abstract readonly type: T;
    public abstract reply(options: ContextReplyOptions): Promise<Message<boolean>>;
}

export default Context;
