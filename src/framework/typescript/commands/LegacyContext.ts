import type { Message, MessageCreateOptions } from "discord.js";
import CommandContextType from "./CommandContextType";
import Context, { type ContextReplyOptions } from "./Context";
import type Application from "@framework/app/Application";

class LegacyContext extends Context<CommandContextType.Legacy> {
    public override readonly type = CommandContextType.Legacy;
    public readonly commandMessage: Message<boolean>;
    public readonly commandName: string;
    public readonly argv: string[];
    public readonly args: string[];

    public constructor(
        application: Application,
        commandMessage: Message<boolean>,
        commandName: string,
        argv: string[],
        args: string[]
    ) {
        super(application);
        this.commandMessage = commandMessage;
        this.commandName = commandName;
        this.argv = argv;
        this.args = args;
    }

    public override reply(options: ContextReplyOptions): Promise<Message<boolean>> {
        return this.commandMessage.reply(options as MessageCreateOptions);
    }
}

export default LegacyContext;
