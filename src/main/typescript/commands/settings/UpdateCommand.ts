import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { Colors } from "@main/constants/Colors";
import StartupManager from "@main/services/StartupManager";
import SystemUpdateService from "@main/services/SystemUpdateService";
import { formatDistanceToNowStrict } from "date-fns";
import {
    APISelectMenuOption,
    ActionRowBuilder,
    Client,
    ComponentType,
    InteractionCollector,
    InteractionType,
    StringSelectMenuBuilder
} from "discord.js";

class UpdateCommand extends Command {
    public override readonly name = "update";
    public override readonly description: string = "Updates the system.";
    public override readonly detailedDescription: string =
        "Updates the system to the latest version.";
    public override readonly defer = true;
    public override readonly usage = [""];
    public override readonly systemPermissions = [];
    public override readonly systemAdminOnly = true;

    @Inject()
    private readonly systemUpdateService!: SystemUpdateService;

    @Inject()
    private readonly startupManager!: StartupManager;

    public override build(): Buildable[] {
        return [this.buildChatInput()];
    }

    public override async execute(context: Context): Promise<void> {
        const { latestStable, latestUnstable } = await this.systemUpdateService.checkForUpdate();

        if (!latestStable && !latestUnstable) {
            await context.replyEmbed({
                author: {
                    name: "System Update",
                    icon_url: this.application.client.user?.displayAvatarURL() ?? undefined
                },
                color: Colors.Primary,
                description: "No updates are available currently.",
                footer: {
                    text: "Up-to-date"
                },
                timestamp: new Date().toISOString()
            });

            return;
        }

        if (
            (!latestStable || !this.systemUpdateService.canAutoUpdate(latestStable)) &&
            (!latestUnstable || !this.systemUpdateService.canAutoUpdate(latestUnstable))
        ) {
            await context.replyEmbed({
                author: {
                    name: "System Update",
                    icon_url: this.application.client.user?.displayAvatarURL() ?? undefined
                },
                color: Colors.Danger,
                description:
                    "\n\n:warning: The updates cannot be automatically applied. Please update manually.",
                timestamp: new Date().toISOString()
            });

            return;
        }

        const selectOptions: (APISelectMenuOption & { emoji: string })[] = [];

        if (latestStable) {
            selectOptions.push({
                label: "Latest Stable",
                value: "latest_stable",
                description: `${latestStable.tag_name} • ${formatDistanceToNowStrict(new Date(latestStable.created_at), { addSuffix: true })}`,
                emoji: "🟢"
            });
        }

        if (latestUnstable) {
            selectOptions.push({
                label: "Latest Unstable",
                value: "latest_unstable",
                description: `${latestUnstable.tag_name} • ${formatDistanceToNowStrict(new Date(latestUnstable.created_at), { addSuffix: true })}`,
                emoji: "🔴"
            });
        }

        const reply = await context.reply({
            embeds: [
                {
                    author: {
                        name: "System Update",
                        icon_url: this.application.client.user?.displayAvatarURL() ?? undefined
                    },
                    color: Colors.Primary,
                    description: "Updates are available. Select a variant below.",
                    timestamp: new Date().toISOString()
                }
            ],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("update_variant")
                        .setPlaceholder("Select an update variant")
                        .addOptions(selectOptions)
                )
            ]
        });

        const collector = new InteractionCollector(this.application.client as Client<true>, {
            message: reply,
            componentType: ComponentType.StringSelect,
            dispose: true,
            filter: interaction => interaction.user.id === context.user.id,
            time: 60_000,
            interactionType: InteractionType.MessageComponent
        });

        let updateStarted = false;

        collector.on("collect", interaction => {
            if (!interaction.isStringSelectMenu()) {
                return;
            }

            updateStarted = true;

            const variant = interaction.values[0];
            const release = variant === "latest_stable" ? latestStable! : latestUnstable!;

            interaction.deferUpdate().catch(this.application.logger.error);

            reply
                .edit({
                    embeds: [
                        {
                            author: {
                                name: "System Update",
                                icon_url:
                                    this.application.client.user?.displayAvatarURL() ?? undefined
                            },
                            color: Colors.Primary,
                            description: `${context.emoji("loading")} System upgrade to version **${release.tag_name}** has been initiated. This may take a few minutes.`,
                            timestamp: new Date().toISOString()
                        }
                    ],
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("update_variant")
                                .addOptions(
                                    selectOptions
                                        .map(option =>
                                            option.value === variant
                                                ? { ...option, default: true }
                                                : option
                                        )
                                        .filter(option => option.value === variant)
                                )
                        )
                    ]
                })
                .catch(this.application.logger.error);
            this.systemUpdateService.update(release);
        });

        collector.on("end", () => {
            if (!updateStarted) {
                reply
                    .edit({
                        embeds: [
                            {
                                author: {
                                    name: "System Update",
                                    icon_url:
                                        this.application.client.user?.displayAvatarURL() ??
                                        undefined
                                },
                                color: Colors.Danger,
                                description: "System upgrade has been cancelled due to inactivity.",
                                timestamp: new Date().toISOString()
                            }
                        ],
                        components: [
                            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId("update_variant")
                                    .setDisabled(true)
                                    .addOptions(selectOptions)
                            )
                        ]
                    })
                    .catch(this.application.logger.error);
            }
        });
    }
}

export default UpdateCommand;
