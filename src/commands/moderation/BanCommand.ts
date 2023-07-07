import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn } from "../../core/Command";

export default class BanCommand extends Command {
    name = "ban";

    validationRules = [
        {
            types: [ArgumentType.User],
            entityNotNull: true,
            requiredErrorMessage: "You must specify a user to ban!",
            typeErrorMessage: "You have specified an invalid user mention or ID.",
            entityNotNullErrorMessage: "The given user does not exist!"
        }
    ];

    permissions = [];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        if (context.isLegacy) {
            console.log(context.parsedArgs);
        }
    }
}