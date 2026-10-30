import type { ArgumentSchema } from "@framework/arguments/ArgumentSchema.js";
import type { ArgumentsOf, OptionsOf } from "@framework/arguments/ArgumentTypes.js";
import RestStringArgument from "@framework/arguments/RestStringArgument.js";
import UserArgument from "@framework/arguments/UserArgument.js";
import Command from "@framework/commands/Command.js";
import { CommandMode } from "@framework/commands/CommandMode.js";
import type Context from "@framework/commands/Context.js";
import { Inject } from "@framework/container/Inject.js";
import InvalidStateError from "@framework/errors/InvalidStateError.js";
import InfractionManagerService from "@main/services/InfractionManagerService.js";
import { DefaultArgumentErrorMessages } from "@main/utils/DefaultArgumentErrorMessages.js";
import { DefaultArgumentRules } from "@main/utils/DefaultArgumentRules.js";
import { CommandInteraction, Message } from "discord.js";

class WarnCommand extends Command {
    public override readonly name = "warn";
    public override readonly description = "Warns a user.";
    public override readonly aliases = [];
    public override readonly modes: CommandMode[] = [CommandMode.Guild];

    public override readonly argumentSchema = {
        overloads: [
            {
                definitions: [
                    {
                        name: "user",
                        type: UserArgument,
                        errorMessages: UserArgument.defaultErrors
                    },
                    {
                        name: "reason",
                        type: RestStringArgument,
                        rules: DefaultArgumentRules.Reason,
                        errorMessages: DefaultArgumentErrorMessages.Reason,
                        isOptional: true
                    }
                ],
                options: {
                    silent: {
                        short: "s"
                    }
                }
            }
        ]
    } as const satisfies ArgumentSchema;

    public override buildChatInput() {
        const builder = super.buildChatInput();

        builder
            .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
            .addStringOption(option => option.setName("reason").setDescription("Reason for this infraction"))
            .addBooleanOption(option =>
                option.setName("silent").setDescription("Whether to supress notification for the user (default: false)")
            )
            .addAttachmentOption(option =>
                option.setName("attachment").setDescription("Additional attachment (if any)")
            );

        return builder;
    }

    @Inject()
    private readonly infractionManager!: InfractionManagerService;

    public override async execute(context: Context, args: ArgumentsOf<WarnCommand>, options: OptionsOf<WarnCommand>) {
        const { user, reason } = args;

        if (!context.inGuild()) {
            throw new InvalidStateError();
        }

        const attachment =
            context.commandMessage instanceof CommandInteraction && context.commandMessage.isChatInputCommand()
                ? context.commandMessage.options.getAttachment("attachment")
                : null;

        const silent =
            context.isInteractive() && context.commandMessage.isChatInputCommand()
                ? (context.commandMessage.options.getBoolean("silent") ?? false)
                : options.silent === "yes";

        const { overviewEmbed, status } = await this.infractionManager.createWarning({
            guildId: context.guildId,
            moderator: context.user,
            user,
            reason: reason ?? undefined,
            attachments:
                context.commandMessage instanceof Message
                    ? [...context.commandMessage.attachments.values()]
                    : attachment
                      ? [attachment]
                      : [],
            generateOverviewEmbed: true,
            notify: !silent
        });

        if (status === "failed") {
            await context.error("Error occurred while creating an infraction.");
            return;
        }

        await context.reply({ embeds: [overviewEmbed] });
    }
}

export default WarnCommand;
