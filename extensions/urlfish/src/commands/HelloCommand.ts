import BaseCommand, { AnyCommandContext, CommandMessage, CommandReturn } from "@sudobot/core/Command";

export default class HelloCommand extends BaseCommand {
    public readonly name: string = "hello";

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        message.reply("Hello world!");
    }
}
