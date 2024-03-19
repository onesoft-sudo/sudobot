import { Message, User } from "discord.js";
import Context from "./Context";
import { ContextType } from "./ContextType";

class LegacyContext extends Context<Message<true>> {
    public override readonly type = ContextType.Legacy;
    public readonly args: string[];
    public readonly argv: string[];
    public readonly commandContent: string;

    public constructor(
        commandName: string,
        commandContent: string,
        commandMessage: Message<true>,
        args: string[],
        argv: string[]
    ) {
        super(commandName, commandMessage);
        this.args = args;
        this.argv = argv;
        this.commandContent = commandContent;
    }

    public override get userId(): string {
        return this.commandMessage.author.id;
    }

    public override get user(): User {
        return this.commandMessage.author;
    }
}

export default LegacyContext;
