import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import StringArgument from "@framework/arguments/StringArgument";
import UserArgument from "@framework/arguments/UserArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import InfractionViewCommand from "@main/commands/moderation/InfractionViewCommand";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { ErrorMessages } from "@main/utils/ErrorMessages";
import { Infraction, InfractionType } from "@prisma/client";
import { PermissionFlagsBits, User } from "discord.js";

type InfractionCreateCommandArgs = {
    user: User;
    type: string;
    reason?: string;
};

@TakesArgument<InfractionCreateCommandArgs>({
    names: ["user"],
    types: [UserArgument<true>],
    optional: false,
    errorMessages: [UserArgument.defaultErrors],
    interactionName: "user",
    interactionType: UserArgument<true>
})
@TakesArgument<InfractionCreateCommandArgs>({
    names: ["type"],
    types: [StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid infraction type provided.",
            [ErrorType.Required]: "Infraction type is required."
        }
    ],
    interactionName: "type",
    interactionType: StringArgument
})
@TakesArgument<InfractionCreateCommandArgs>({
    names: ["reason"],
    types: [RestStringArgument],
    optional: true,
    errorMessages: [ErrorMessages.Reason],
    rules: [ArgumentDefaultRules.Reason],
    interactionRuleIndex: 0,
    interactionName: "reason",
    interactionType: RestStringArgument
})
class InfractionCreateCommand extends Command {
    public override readonly name = "infraction::create";
    public override readonly description: string = "Create a new infraction.";
    public override readonly permissions = [
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ViewAuditLog
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly usage = ["<user: User> <type: InfractionType> [reason: string]"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionCreateCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const { type: rawType, user, reason } = args;
        const type = rawType.toUpperCase();

        if (!Object.values(InfractionType).includes(type as InfractionType)) {
            await context.error("Invalid infraction type provided.");
            return;
        }

        const durationString = context.isChatInput()
            ? context.options.getString("duration")
            : undefined;
        const duration = durationString
            ? Duration.fromDurationStringExpression(durationString)
            : undefined;
        const notify = context.isChatInput() && !!context.options.getBoolean("notify");

        const infraction: Infraction = await this.infractionManager.createInfraction({
            type: type as InfractionType,
            user,
            guildId: context.guild.id,
            moderator: context.user,
            reason,
            notify,
            generateOverviewEmbed: false,
            processReason: true,
            sendLog: false,
            payload: {
                expiresAt: duration?.fromNow(),
                metadata: duration
                    ? {
                          duration: duration?.fromNowMilliseconds()
                      }
                    : undefined
            }
        });

        await context.reply({
            embeds: [InfractionViewCommand.buildEmbed(infraction, user, context.user, "Created")]
        });
    }
}

export default InfractionCreateCommand;
