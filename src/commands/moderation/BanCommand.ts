import { ChatInputCommandInteraction, EmbedBuilder, PermissionsBitField, User, escapeMarkdown } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class BanCommand extends Command {
    name = "ban";

    validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            entityNotNull: true,
            requiredErrorMessage: "You must specify a user to ban!",
            typeErrorMessage: "You have specified an invalid user mention or ID.",
            entityNotNullErrorMessage: "The given user does not exist!"
        },
        {
            types: [ArgumentType.Integer, ArgumentType.StringRest],
            optional: true,
            minMaxErrorMessage: "The message deletion range must be a number from 0 to 7.",
            typeErrorMessage: "You have specified an invalid argument. The system expected you to provide a ban reason or the message deletion range here.",
            minValue: 0,
            maxValue: 7,
            lengthMax: 3999
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            typeErrorMessage: "You have specified an invalid ban reason.",
            lengthMax: 3999
        }
    ];

    permissions = [PermissionsBitField.Flags.BanMembers];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        if (message instanceof ChatInputCommandInteraction)
            await message.deferReply();

        const user: User = context.isLegacy ? context.parsedArgs[0] : context.options.getUser("user", true);
        const days = !context.isLegacy ? context.options.getInteger("days") ?? undefined : (
            typeof context.parsedArgs[1] === 'number' ? context.parsedArgs[1] : undefined
        );
        const reason = !context.isLegacy ? context.options.getString('reason') ?? undefined : (
            typeof context.parsedArgs[1] === 'string' ? context.parsedArgs[1] : context.parsedArgs[2]
        );

        await this.deferredReply(message, {
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: user.tag,
                        icon_url: user.displayAvatarURL()
                    },
                    color: 0xf14a60,
                    description: `**${escapeMarkdown(user.tag)}** has been banned from this server.`,
                    fields: [
                        {
                            name: 'Reason',
                            value: reason ?? '*No reason provided*'
                        },
                        {
                            name: 'Message Deletion',
                            value: days ? `Messages from this user in the past ${days} day${days === 1 ? '' : 's'} will be deleted` : "*No message will be deleted*"
                        },
                        {
                            name: "Infraction ID",
                            value: "10012"
                        }
                    ],
                    footer: {
                        text: "Banned"
                    },
                })
                    .setTimestamp()
            ]
        });
    }
}