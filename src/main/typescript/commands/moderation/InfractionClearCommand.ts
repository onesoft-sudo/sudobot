import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import UserArgument from "@framework/arguments/UserArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { InfractionType } from "@main/models/Infraction";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { bold, User } from "discord.js";

type InfractionClearCommandArgs = {
    user: User;
    type?: string;
};

@ArgumentSchema({
    overloads: [
        {
            definitions: [
                {
                    names: ["user"],
                    types: [UserArgument<true>],
                    optional: false,
                    errorMessages: [UserArgument.defaultErrors],
                    interactionName: "user",
                    interactionType: UserArgument<true>
                },
                {
                    names: ["type"],
                    types: [StringArgument],
                    optional: true,
                    errorMessages: [
                        {
                            [ErrorType.InvalidType]: "Invalid infraction type provided.",
                            [ErrorType.Required]: "Infraction type is required."
                        }
                    ],
                    interactionName: "type",
                    interactionType: StringArgument
                }
            ]
        }
    ]
})
class InfractionClearCommand extends Command {
    public override readonly name = "infraction::clear";
    public override readonly description: string = "Clear all infractions of a user";
    public override readonly aliases = ["infraction::clear", "infraction::rmrf"];
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly usage = ["<user: User> [type: InfractionType]"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionClearCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const { type: rawType, user } = args;
        const type = rawType?.toUpperCase();

        if (type && !Object.values(InfractionType).includes(type as InfractionType)) {
            await context.error("Invalid infraction type provided.");
            return;
        }

        const count = await this.infractionManager.deleteForUser(context.guildId, user.id, type as InfractionType);

        if (count === 0) {
            await context.error(`No infractions found for ${bold(user.username)}`);
        } else {
            await context.success(
                `Cleared ${bold(count.toString())} infraction(s) for ${bold(user.username)}`
            );
        }
    }
}

export default InfractionClearCommand;
