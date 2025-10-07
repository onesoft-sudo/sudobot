import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { fetchChannel } from "@framework/utils/entities";
import { getEnvData } from "@main/env/env";
import { getHomeGuild } from "@main/utils/utils";
import {
    bold,
    ContainerBuilder,
    escapeMarkdown,
    InteractionContextType,
    MessageFlags,
    SeparatorSpacingSize,
    TextDisplayBuilder
} from "discord.js";

type RequestDeletionCommandArgs = {
    message?: string;
};

@ArgumentSchema.Definition({
    names: ["message"],
    types: [RestStringArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid message given",
            [ErrorType.InvalidRange]: "Message must not be empty or have more than 2000 characters"
        }
    ],
    interactionName: "message",
    rules: [
        {
            "range:max": 2000,
            "range:min": 1
        }
    ]
})
class RequestDeletionCommand extends Command {
    public override readonly name = "reqdel";
    public override readonly description: string =
        "Request deletion of your data. If you don't accept DMs, please provide a contact method.";
    public override readonly defer = true;
    public override readonly supportsDirectMessages = true;
    public override readonly aliases = ["request-deletion"];
    public override readonly usage = [""];
    public override readonly cooldown = 60_000;
    public override readonly maxAttempts = 1;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .setName("request-deletion")
                .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild)
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription(
                            "Your message for us. If you don't accept DMs, please provide a contact method."
                        )
                        .setMaxLength(2000)
                        .setMinLength(1)
                )
        ];
    }

    private async failed(context: Context) {
        await context.error("Unable to process your request at the moment.");
    }

    public override async execute(context: Context, args: RequestDeletionCommandArgs): Promise<void> {
        const channelId = getEnvData().DATA_DELETION_REQUESTS_CHANNEL_ID;

        if (!channelId) {
            await this.failed(context);
            return;
        }

        const guild = await getHomeGuild(this.application.client);

        if (!guild) {
            await this.failed(context);
            return;
        }

        const channel = await fetchChannel(guild, channelId);

        if (!channel?.isSendable()) {
            await this.failed(context);
            return;
        }

        await channel.send({
            flags: [MessageFlags.IsComponentsV2],
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## Data deletion request: ${context.commandMessage.id}`)
                    )
                    .addSeparatorComponents(sep => sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `${bold("User")}: <@${context.user.id}> (${escapeMarkdown(context.user.username)})\n` +
                                `${bold("User ID")}: ${context.user.id}`
                        )
                    )
                    .addSeparatorComponents(sep => sep.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### User's message\n\n${args.message || "*Empty*"}`)
                    )
            ],
            allowedMentions: { parse: [], users: [], roles: [] }
        });

        await context.success("Your request has been submitted successfully.");
    }
}

export default RequestDeletionCommand;
