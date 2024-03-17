import { Command, CommandMessage } from "../framework/commands/Command";
import Context from "../framework/commands/Context";

declare global {
    interface ClientEvents {
        command: [name: string, command: Command, message: CommandMessage, context: Context];
    }
}

export { ClientEvents };
