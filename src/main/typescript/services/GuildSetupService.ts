import { ContextReplyOptions } from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { TODO } from "@framework/utils/devflow";
import { Colors } from "@main/constants/Colors";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { emoji } from "@main/utils/emoji";
import {
    ActionRowBuilder,
    APIEmbed,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    escapeInlineCode,
    Guild,
    GuildMember,
    type Interaction,
    Message,
    MessageEditOptions,
    ModalBuilder,
    ModalSubmitInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextBasedChannel,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";

enum SetupOption {
    Prefix = "prefix",
    Logging = "logging"
}

type SetupState = {
    timeout: Timer;
    message: Message | ChatInputCommandInteraction;
    stack: ContextReplyOptions[];
    finishable?: boolean;
};

@Name("guildSetupService")
class GuildSetupService extends Service implements HasEventListeners {
    private static readonly handlers: Record<SetupOption, keyof GuildSetupService> = {
        [SetupOption.Prefix]: "handlePrefixSetup",
        [SetupOption.Logging]: "handleLoggingSetup"
    };
    private readonly inactivityTimeout: number = 120_000;
    private readonly setupState: Map<string, SetupState> = new Map();

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    public async initialize(
        memberOrChannel:
            | GuildMember
            | Extract<TextBasedChannel, { send: unknown; guild: unknown }>
            | (ChatInputCommandInteraction & { guild: Guild })
            | Message<true>
    ) {
        try {
            const options = {
                embeds: [
                    this.embed(
                        [],
                        `${emoji(this.application, "check")} Welcome to SudoBot! To get started, please select one of the following options to configure.`
                    )
                ],
                components: [
                    this.selectMenu(memberOrChannel.guild.id),
                    this.buttonRow(memberOrChannel.guild.id, {
                        cancel: true
                    })
                ]
            };
            const message =
                memberOrChannel instanceof ChatInputCommandInteraction
                    ? memberOrChannel
                    : memberOrChannel instanceof Message
                      ? await memberOrChannel.reply(options)
                      : await memberOrChannel.send(options);

            if (memberOrChannel instanceof ChatInputCommandInteraction) {
                await memberOrChannel.reply({
                    ...options,
                    fetchReply: true,
                    ephemeral: true
                });
            }

            this.setupState.set(memberOrChannel.guild.id, {
                timeout: setTimeout(() => {
                    this.setupState.delete(memberOrChannel.guild.id);
                    const options = this.cancelledOptions([]);
                    (message instanceof Message
                        ? message.edit(options as MessageEditOptions)
                        : message.editReply(options as MessageEditOptions)
                    ).catch(this.application.logger.error);
                }, this.inactivityTimeout),
                message,
                stack: [options]
            });
        } catch (error) {
            this.application.logger.error(error);
        }
    }

    private selectMenu(guildId: string, disabled = false) {
        return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`setup::${guildId}::select`)
                .setPlaceholder("Select a setting to configure")
                .addOptions([
                    {
                        label: "Command Prefix",
                        value: SetupOption.Prefix,
                        emoji: "🔧",
                        description: "Change the legacy command prefix for this server."
                    },
                    {
                        label: "Audit Logging",
                        value: SetupOption.Logging,
                        emoji: "📜",
                        description: "Configure audit logging for this server."
                    }
                ])
                .setMinValues(1)
                .setMaxValues(1)
                .setDisabled(disabled)
        );
    }

    private buttonRow(guildId: string, { back = false, finish = false, cancel = false } = {}) {
        const state = this.setupState.get(guildId);

        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`setup::${guildId}::back`)
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!back && (!state?.stack.length || state.stack.length <= 1)),
            new ButtonBuilder()
                .setCustomId(`setup::${guildId}::finish`)
                .setLabel("Finish")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!finish && !state?.finishable),
            new ButtonBuilder()
                .setCustomId(`setup::${guildId}::cancel`)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!cancel)
        );
    }

    private embed(path: string[], description: string, options?: APIEmbed) {
        return {
            author: {
                name: "SudoBot Setup",
                icon_url: this.application.client.user?.displayAvatarURL() ?? undefined
            },
            description: `${description}\n\n-# ${["Setup", ...path].join(" > ")}`,
            color: 0x007bff,
            ...options
        };
    }

    private cancelledOptions(path: string[], inactivity = false) {
        return {
            embeds: [
                this.embed(
                    path,
                    `${emoji(this.application, "error")} Setup has been cancelled${inactivity ? " due to inactivity" : ""}.`,
                    {
                        color: 0xf14a60
                    }
                )
            ],
            components: [this.selectMenu("0", true), this.buttonRow("0")]
        };
    }

    private async goBack(guildId: string) {
        const state = this.setupState.get(guildId);

        if (!state) {
            return;
        }

        state.stack.pop();
        await this.updateMessage(guildId);
    }

    private async updateMessage(guildId: string) {
        const state = this.setupState.get(guildId);

        if (!state) {
            return;
        }

        const options = state.stack.at(-1);

        if (!options) {
            return;
        }

        await (
            state.message instanceof Message
                ? state.message.edit(options as MessageEditOptions)
                : state.message.editReply(options as MessageEditOptions)
        ).catch(this.application.logger.error);
    }

    private async pushState(guildId: string, options: ContextReplyOptions) {
        const state = this.setupState.get(guildId);

        if (!state) {
            return;
        }

        state.stack.push(options);
        await this.updateMessage(guildId);
    }

    private async handlePrefixUpdate(guildId: string, interaction: ModalSubmitInteraction) {
        if (!this.configManager.config[guildId]) {
            this.configManager.autoConfigure(guildId);
        }

        const config = this.configManager.config[guildId];

        if (!config) {
            return;
        }

        await interaction.deferUpdate().catch(this.application.logger.error);

        const prefix = interaction.fields.getTextInputValue("prefix");

        if (!prefix || prefix.includes(" ")) {
            await this.pushState(guildId, {
                embeds: [
                    this.embed(
                        ["Prefix"],
                        `${emoji(this.application, "error")} Command prefix must not contain spaces.`,
                        {
                            color: Colors.Danger
                        }
                    )
                ],

                components: [
                    this.selectMenu(guildId, true),
                    this.buttonRow(guildId, {
                        back: true,
                        cancel: true
                    })
                ]
            });

            return;
        }

        const state = this.setupState.get(guildId);

        if (state) {
            state.finishable = true;
        }

        config.prefix = prefix;
        await this.configManager.write({ guild: true, system: false });
        await this.configManager.load();

        await this.pushState(guildId, {
            embeds: [
                this.embed(
                    ["Prefix"],
                    `${emoji(this.application, "error")} Updated the command prefix successfully. The new prefix is \`${escapeInlineCode(prefix)}\`.\nPress "Back" to return to the previous menu.`,
                    {
                        color: Colors.Success
                    }
                )
            ],
            components: [
                this.selectMenu(guildId, true),
                this.buttonRow(guildId, {
                    back: true,
                    cancel: true,
                    finish: true
                })
            ]
        });
    }

    private ping(guildId: string) {
        const state = this.setupState.get(guildId);

        if (!state) {
            return;
        }

        clearTimeout(state.timeout);
        state.timeout = setTimeout(() => {
            this.setupState.delete(guildId);
            const options = this.cancelledOptions([], true);
            (state.message instanceof Message
                ? state.message.edit(options)
                : state.message.editReply(options)
            ).catch(this.application.logger.error);
        }, this.inactivityTimeout);
    }

    public finishSetup(guildId: string) {
        const state = this.setupState.get(guildId);

        if (!state) {
            return;
        }

        clearTimeout(state.timeout);
        this.setupState.delete(guildId);

        const options = {
            embeds: [
                this.embed(
                    [],
                    `${emoji(this.application, "check")} Setup has been completed successfully.`
                )
            ],
            components: [
                this.selectMenu("0", true),
                this.buttonRow("0", { cancel: false, back: false, finish: false })
            ]
        };

        (state.message instanceof Message
            ? state.message.edit(options as MessageEditOptions)
            : state.message.editReply(options as MessageEditOptions)
        ).catch(this.application.logger.error);
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (interaction.isModalSubmit() && interaction.customId.startsWith("setup::")) {
            const [, guildId, id] = interaction.customId.split("::");

            this.ping(guildId);

            switch (id) {
                case "prefix_modal":
                    await this.handlePrefixUpdate(guildId, interaction);
                    break;
            }

            return;
        }

        if (interaction.isButton() && interaction.customId.startsWith("setup::")) {
            const [, guildId, id] = interaction.customId.split("::");

            if (id === "cancel") {
                const { timeout } = this.setupState.get(guildId) ?? {};

                if (timeout) {
                    clearTimeout(timeout);
                    this.setupState.delete(guildId);
                }

                await interaction
                    .update(this.cancelledOptions([]))
                    .catch(this.application.logger.error);
                return;
            }

            const state = this.setupState.get(guildId);

            if (!state) {
                return;
            }

            await interaction.deferUpdate().catch(this.application.logger.error);
            this.ping(guildId);

            switch (id) {
                case "back":
                    await this.goBack(guildId);
                    break;
                case "finish":
                    this.finishSetup(guildId);
                    break;
            }

            return;
        }

        if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith("setup::")) {
            return;
        }

        const value = interaction.values[0] as SetupOption;

        if (!value) {
            return;
        }

        const handler = GuildSetupService.handlers[value];

        if (!handler) {
            return;
        }

        const [, guildId] = interaction.customId.split("::");
        this.ping(guildId);

        await (
            this[handler] as (
                guildId: string,
                interaction: StringSelectMenuInteraction
            ) => Promise<void>
        ).call(this, guildId, interaction);
    }

    public async handlePrefixSetup(guildId: string, interaction: StringSelectMenuInteraction) {
        const state = this.setupState.get(guildId);

        if (!state) {
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`setup::${guildId}::prefix_modal`)
            .setTitle("Change Command Prefix")
            .setComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("Prefix")
                        .setCustomId("prefix")
                        .setPlaceholder("Enter a new prefix")
                        .setMinLength(1)
                        .setMaxLength(128)
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(modal).catch(this.application.logger.error);
    }

    public handleLoggingSetup(_guildId: string, _interaction: StringSelectMenuInteraction) {
        TODO();
    }
}

export default GuildSetupService;
