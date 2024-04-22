import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import DurationArgument from "@framework/arguments/DurationArgument";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { PermissionFlagsBits, bold } from "discord.js";

type InfractionDurationCommandArgs = {
    id: number;
    duration: Duration | string;
};

@TakesArgument<InfractionDurationCommandArgs>({
    names: ["id"],
    types: [IntegerArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid infraction ID provided.",
            [ErrorType.Required]: "Infraction ID is required."
        }
    ],
    interactionName: "id",
    interactionType: IntegerArgument
})
@TakesArgument<InfractionDurationCommandArgs>({
    names: ["duration"],
    types: [DurationArgument, StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid duration provided.",
            [ErrorType.Required]: "Duration is required."
        }
    ],
    interactionName: "duration",
    interactionType: StringArgument
})
class InfractionDurationCommand extends Command {
    public override readonly name = "infraction::duration";
    public override readonly description: string =
        "Update the duration of a mute/ban/role infraction.";
    public override readonly permissions = [PermissionFlagsBits.ManageMessages];
    public override readonly usage = ['<id: number> <duration: Duration | "none">'];
    public override readonly aliases: string[] = ["infraction::d"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionDurationCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const { id, duration: legacyDuration } = args;
        const durationString = context.isChatInput() ? context.options.getString("duration") : null;
        let duration: Duration | string;

        try {
            duration = durationString
                ? Duration.fromDurationStringExpression(durationString)
                : legacyDuration;

            if (typeof duration === "string" && duration.toLowerCase() !== "none") {
                throw new Error();
            }
        } catch (error) {
            await context.error("Invalid duration provided.");
            return;
        }

        const { error, infraction, success } = await this.infractionManager.updateDurationById(
            context.guildId!,
            id,
            typeof duration === "string" ? null : (duration as Duration),
            !context.isChatInput() || context.options.getBoolean("notify") !== false
        );

        if (error === "infraction_not_found") {
            await context.error("No infraction found with that ID.");
            return;
        }

        if (error === "invalid_infraction_type") {
            await context.error(
                "Cannot set duration for this type of infraction. Only ban, mute, and role infractions can have a duration."
            );

            return;
        }

        if (error === "invalid_duration") {
            await context.error("Invalid duration provided for this infraction.");
            return;
        }

        if (error === "infraction_expired") {
            await context.error("This infraction has already expired.");
            return;
        }

        if (!success) {
            await context.error("Failed to update duration for this infraction.");
            return;
        }

        await context.success(
            `Updated duration for infraction with ID ${bold(infraction!.id.toString())} to ${bold(duration.toString())} from now.`
        );
    }
}

export default InfractionDurationCommand;
