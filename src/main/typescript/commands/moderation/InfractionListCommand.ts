import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import UserArgument from "@framework/arguments/UserArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { Colors } from "@main/constants/Colors";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { Infraction } from "@prisma/client";
import { User, italic, time } from "discord.js";

type InfractionListCommandArgs = {
    user: User;
};

@TakesArgument<InfractionListCommandArgs>({
    names: ["user"],
    types: [UserArgument<true>],
    optional: false,
    errorMessages: [UserArgument.defaultErrors],
    interactionName: "user",
    interactionType: UserArgument<true>
})
class InfractionListCommand extends Command {
    public override readonly name = "infraction::list";
    public override readonly description: string = "List infractions for a user.";
    public override readonly aliases = ["infraction::ls", "infraction::s"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionListCommandArgs
    ): Promise<void> {
        const infractions: Infraction[] = await this.infractionManager.getUserInfractions(
            args.user.id
        );

        if (infractions.length === 0) {
            await context.error("No infraction found for that user.");
            return;
        }

        let description = "";

        for (const infraction of infractions) {
            description += `### Infraction #${infraction.id}\n`;
            description += `**Type:** ${this.infractionManager.prettifyInfractionType(infraction.type)}\n`;
            description += `***Moderator:** ${infraction.moderatorId ? `<@${infraction.moderatorId}> (${infraction.moderatorId})` : italic("Unknown")}\n`;
            description += `**Reason:**\n${infraction.reason ? infraction.reason.slice(0, 150) + (infraction.reason.length > 150 ? "\n..." : "") : italic("No reason provided")}\n`;
            description += `**Created at:** ${time(infraction.createdAt)}\n\n`;
        }

        await context.reply({
            embeds: [
                {
                    author: {
                        name: `Infractions for ${args.user.username}`,
                        icon_url: args.user.displayAvatarURL()
                    },
                    color: Colors.Primary,
                    description,
                    footer: {
                        text: `Total infractions: ${infractions.length}`
                    }
                }
            ]
        });
    }
}

export default InfractionListCommand;
