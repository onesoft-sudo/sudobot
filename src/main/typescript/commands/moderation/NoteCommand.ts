import type { ArgumentSchema } from "@framework/arguments/ArgumentSchema.js";
import type { ArgumentsOf } from "@framework/arguments/ArgumentTypes.js";
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

class NoteCommand extends Command {
    public override readonly name = "note";
    public override readonly description = "Saves a note on a user.";
    public override readonly aliases = [];
    public override readonly modes: CommandMode[] = [CommandMode.Guild];

    public override readonly argumentSchema = {
        overloads: [
            {
                definitions: [
                    {
                        name: "user",
                        type: UserArgument,
                        errorMessages: UserArgument.defaultErrors,
                        description: "The target user."
                    },
                    {
                        name: "reason",
                        type: RestStringArgument,
                        rules: DefaultArgumentRules.Reason,
                        errorMessages: DefaultArgumentErrorMessages.Reason,
                        isOptional: true,
                        description: "Reason for this infraction."
                    }
                ]
            }
        ]
    } as const satisfies ArgumentSchema;

    public override buildChatInput() {
        const builder = super.buildChatInput();

        builder
            .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
            .addStringOption(option => option.setName("reason").setDescription("Reason for this infraction"))
            .addAttachmentOption(option =>
                option.setName("attachment").setDescription("Additional attachment (if any)")
            );

        return builder;
    }

    @Inject()
    private readonly infractionManager!: InfractionManagerService;

    public override async execute(context: Context, args: ArgumentsOf<NoteCommand>) {
        const { user, reason } = args;

        if (!context.inGuild()) {
            throw new InvalidStateError();
        }

        const attachments =
            context.commandMessage instanceof CommandInteraction && context.commandMessage.isChatInputCommand()
                ? context.commandMessage.options.getAttachment("attachment")
                    ? [context.commandMessage.options.getAttachment("attachment")!]
                    : undefined
                : context.commandMessage instanceof Message
                  ? [...context.commandMessage.attachments.values()]
                  : undefined;

        const { overviewEmbed, status } = await this.infractionManager.createNote({
            guildId: context.guildId,
            moderator: context.user,
            user,
            reason: reason ?? undefined,
            attachments,
            generateOverviewEmbed: true
        });

        if (status === "failed") {
            await context.error("Error occurred while creating the note.");
            return;
        }

        await context.reply({ embeds: [overviewEmbed] });
    }
}

export default NoteCommand;
