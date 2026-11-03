import { OPTION_PRESENT_NO_ARG } from "@framework/arguments/ArgumentParser.js";
import type { ArgumentSchema } from "@framework/arguments/ArgumentSchema.js";
import type { ArgumentsOf, OptionsOf } from "@framework/arguments/ArgumentTypes.js";
import DurationArgument from "@framework/arguments/DurationArgument.js";
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument.js";
import RestStringArgument from "@framework/arguments/RestStringArgument.js";
import Command from "@framework/commands/Command.js";
import { CommandMode } from "@framework/commands/CommandMode.js";
import InteractionContext from "@framework/commands/InteractionContext.js";
import LegacyContext from "@framework/commands/LegacyContext.js";
import { Inject } from "@framework/container/Inject.js";
import InvalidStateError from "@framework/errors/InvalidStateError.js";
import InfractionManagerService from "@main/services/InfractionManagerService.js";
import { DefaultArgumentErrorMessages } from "@main/utils/DefaultArgumentErrorMessages.js";
import { DefaultArgumentRules } from "@main/utils/DefaultArgumentRules.js";
import { ChatInputCommandInteraction, CommandInteraction, GuildTextBasedChannel, Message } from "discord.js";

class MuteCommand extends Command {
    public override readonly name = "mute";
    public override readonly description = "Mutes a member.";
    public override readonly aliases = [];
    public override readonly modes: CommandMode[] = [CommandMode.Guild];

    private readonly optionsSchema = {
        silent: {
            short: "s",
            description: "Whether to skip notifying the member."
        },
        hard: {
            short: "H",
            description: "Perform a hard mute; take out all roles from the member."
        },
        clear: {
            short: "c",
            argument: "optional",
            description: "Clear [N?=20] messages from the member in this channel."
        }
    } as const;

    public override readonly argumentSchema = {
        overloads: [
            {
                definitions: [
                    {
                        name: "member",
                        type: GuildMemberArgument,
                        errorMessages: GuildMemberArgument.defaultErrors
                    },
                    {
                        name: "duration",
                        type: DurationArgument,
                        errorMessages: DurationArgument.defaultErrors
                    },
                    {
                        name: "reason",
                        type: RestStringArgument,
                        rules: DefaultArgumentRules.Reason,
                        errorMessages: DefaultArgumentErrorMessages.Reason,
                        isOptional: true
                    }
                ],
                options: this.optionsSchema
            },
            {
                definitions: [
                    {
                        name: "member",
                        type: GuildMemberArgument,
                        errorMessages: GuildMemberArgument.defaultErrors,
                        description: "The target member."
                    },
                    {
                        name: "reason",
                        type: RestStringArgument,
                        rules: DefaultArgumentRules.Reason,
                        errorMessages: DefaultArgumentErrorMessages.Reason,
                        isOptional: true,
                        description: "Reason for this infraction."
                    }
                ],
                options: this.optionsSchema
            }
        ]
    } as const satisfies ArgumentSchema;

    public override buildChatInput() {
        const builder = super.buildChatInput();

        builder
            .addUserOption(option => option.setName("member").setDescription("The target member").setRequired(true))
            .addStringOption(option => option.setName("reason").setDescription("Reason for this infraction"))
            .addBooleanOption(option =>
                option.setName("notify").setDescription("Whether to notify the user (default: true)")
            )
            .addStringOption(option =>
                option
                    .setName("mode")
                    .setDescription("Mute operation mode")
                    .setChoices([
                        {
                            name: "Default Mode",
                            value: "default"
                        },
                        {
                            name: "Hard Mode",
                            value: "hard"
                        }
                    ])
            )
            .addIntegerOption(option =>
                option
                    .setName("clear_count")
                    .setDescription("Clear [N] messages from the member in this channel")
                    .setMinValue(0)
                    .setMaxValue(100)
            )
            .addAttachmentOption(option =>
                option.setName("attachment").setDescription("Additional attachment (if any)")
            );

        return builder;
    }

    @Inject()
    private readonly infractionManager!: InfractionManagerService;

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>,
        args: ArgumentsOf<MuteCommand>,
        options: OptionsOf<MuteCommand>
    ) {
        const { member, reason } = args;

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

        const notify = context.isInteractive()
            ? !context.commandMessage.options.getBoolean("notify")
            : options.silent !== OPTION_PRESENT_NO_ARG;

        const hard = context.isInteractive()
            ? context.commandMessage.options.getString("mode") === "hard"
            : options.hard === OPTION_PRESENT_NO_ARG;

        const clearCount = context.isInteractive()
            ? (context.commandMessage.options.getInteger("clear_count") ?? 0)
            : options.clear !== undefined
              ? options.clear === ""
                  ? 20
                  : +options.clear
              : 0;

        if (Number.isNaN(clearCount) || clearCount < 0 || clearCount > 100) {
            await context.error("The given message clear count is invalid.");
            return;
        }

        const result = await this.infractionManager.createMute({
            guildId: context.guildId,
            moderator: context.user,
            member,
            reason: reason ?? undefined,
            attachments,
            generateOverviewEmbed: true,
            notify,
            channel: clearCount > 0 ? ((context.channel ?? undefined) as GuildTextBasedChannel) : undefined,
            clearMessagesCount: clearCount > 0 ? clearCount : undefined,
            duration: "duration" in args ? args.duration : undefined,
            roleTakeout: hard
        });

        if (result.status === "failed") {
            await context.error(result.errorDescription ?? "Error occurred while performing the mute.");
            return;
        }

        await context.reply({ embeds: [result.overviewEmbed] });
    }
}

export default MuteCommand;
