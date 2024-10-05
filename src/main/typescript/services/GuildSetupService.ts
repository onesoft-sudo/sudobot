import { ContextReplyOptions } from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { fetchChannel, fetchMember } from "@framework/utils/entities";
import { Colors } from "@main/constants/Colors";
import { AIAutoModSchema } from "@main/schemas/AIAutoModSchema";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { emoji } from "@main/utils/emoji";
import {
    ActionRowBuilder,
    APIEmbed,
    ButtonBuilder,
    ButtonInteraction,
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
    Logging = "logging",
    AIBasedAutoMod = "ai_automod"
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
        [SetupOption.Logging]: "handleLoggingSetup",
        [SetupOption.AIBasedAutoMod]: "handleAIAutoModSetup"
    };
    private readonly inactivityTimeout: number = 120_000;
    private readonly setupState: Map<`${string}::${string}::${string}`, SetupState> = new Map();

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    public async initialize(
        memberOrChannel:
            | GuildMember
            | Extract<TextBasedChannel, { send: unknown; guild: unknown }>
            | (ChatInputCommandInteraction & { guild: Guild })
            | Message<true>,
        targetId: string
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
                    this.buttonRow(memberOrChannel.guild.id, targetId, "0", {
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
            let messageId: string;

            if (memberOrChannel instanceof ChatInputCommandInteraction) {
                const { id } = await memberOrChannel.reply({
                    ...options,
                    fetchReply: true,
                    ephemeral: true
                });

                messageId = id;
            } else {
                messageId = message.id;
            }

            const key = `${memberOrChannel.guild.id}::${targetId}::${messageId}` as const;

            this.setupState.set(key, {
                timeout: setTimeout(() => {
                    this.setupState.delete(key);
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
                    },
                    {
                        label: "AI AutoMod",
                        value: SetupOption.AIBasedAutoMod,
                        emoji: "🛡️",
                        description: "Configure AI-powered automatic moderation for this server."
                    }
                ])
                .setMinValues(1)
                .setMaxValues(1)
                .setDisabled(disabled)
        );
    }

    private buttonRow(
        guildId: string,
        id: string,
        messageId: string,
        { back = false, finish = false, cancel = false } = {}
    ) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`setup::${guildId}::back`)
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!back || !state?.stack.length),
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
            components: [this.selectMenu("0", true), this.buttonRow("0", "0", "0")]
        };
    }

    private async goBack(guildId: string, id: string, messageId: string) {
        this.popState(guildId, id, messageId);
        await this.updateMessage(guildId, id, messageId);
    }

    private popState(guildId: string, id: string, messageId: string) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        if (!state || !state.stack.length) {
            return;
        }

        if (state.stack.length <= 1) {
            state.stack = [state.stack[0]];
        }

        state.stack.pop();
    }

    private resetState(guildId: string, id: string, messageId: string, keep = 1) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        if (!state) {
            return;
        }

        state.stack = state.stack.slice(0, keep);
    }

    private async updateMessage(guildId: string, id: string, messageId: string) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

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

    private async pushState(
        guildId: string,
        id: string,
        messageId: string,
        options: ContextReplyOptions
    ) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        if (!state) {
            return;
        }

        state.stack.push(options);
        await this.updateMessage(guildId, id, messageId);
    }

    private async handlePrefixUpdate(
        guildId: string,
        id: string,
        messageId: string,
        interaction: ModalSubmitInteraction
    ) {
        if (!this.configManager.config[guildId]) {
            this.configManager.autoConfigure(guildId);
        }

        const config = this.configManager.config[guildId];

        if (!config) {
            return;
        }

        await interaction.deferUpdate().catch(this.application.logger.error);

        const prefix = interaction.fields.getTextInputValue("prefix");

        this.resetState(guildId, id, messageId);

        if (!prefix || prefix.includes(" ")) {
            await this.pushState(guildId, id, messageId, {
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
                    this.buttonRow(guildId, id, messageId, {
                        back: true,
                        cancel: true
                    })
                ]
            });

            return;
        }

        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        if (state) {
            state.finishable = true;
        }

        config.prefix = prefix;
        await this.configManager.write({ guild: true, system: false });
        await this.configManager.load();

        await this.pushState(guildId, id, messageId, {
            embeds: [
                this.embed(
                    ["Prefix"],
                    `${emoji(this.application, "check")} Updated the command prefix successfully. The new prefix is \`${escapeInlineCode(prefix)}\`.\nPress "Back" to return to the previous menu.`,
                    {
                        color: Colors.Success
                    }
                )
            ],
            components: [
                this.selectMenu(guildId, true),
                this.buttonRow(guildId, id, messageId, {
                    back: true,
                    cancel: true,
                    finish: true
                })
            ]
        });
    }

    private ping(guildId: string, id: string, messageId: string) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        if (!state) {
            return;
        }

        clearTimeout(state.timeout);
        state.timeout = setTimeout(() => {
            this.setupState.delete(`${guildId}::${id}::${messageId}`);
            const options = this.cancelledOptions([], true);
            (state.message instanceof Message
                ? state.message.edit(options)
                : state.message.editReply(options)
            ).catch(this.application.logger.error);
        }, this.inactivityTimeout);
    }

    public finishSetup(guildId: string, id: string, messageId: string) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        if (!state) {
            return;
        }

        clearTimeout(state.timeout);
        this.setupState.delete(`${guildId}::${id}::${messageId}`);

        const options = {
            embeds: [
                this.embed(
                    [],
                    `${emoji(this.application, "check")} Setup has been completed successfully.`
                )
            ],
            components: [
                this.selectMenu("0", true),
                this.buttonRow("0", "0", messageId, { cancel: false, back: false, finish: false })
            ]
        };

        (state.message instanceof Message
            ? state.message.edit(options as MessageEditOptions)
            : state.message.editReply(options as MessageEditOptions)
        ).catch(this.application.logger.error);
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (
            (interaction.isButton() ||
                interaction.isAnySelectMenu() ||
                interaction.isModalSubmit()) &&
            !interaction.memberPermissions?.has("ManageGuild")
        ) {
            await interaction.reply({
                content: `${emoji(this.application, "error")} You don't have the required permissions to configure settings.`,
                ephemeral: true
            });

            return;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("setup::")) {
            const { message } = interaction;

            if (!message) {
                await interaction.reply({
                    content: `${emoji(this.application, "error")} The session has expired. Please run the command again.`,
                    ephemeral: true
                });

                return;
            }

            const [, guildId, id] = interaction.customId.split("::");

            this.ping(guildId, interaction.user.id, message.id);

            switch (id) {
                case "prefix_modal":
                    await this.handlePrefixUpdate(
                        guildId,
                        interaction.user.id,
                        message.id,
                        interaction
                    );
                    break;
                case "logging_channel_modal":
                    await this.handleLoggingChannelUpdateModalSubmit(
                        guildId,
                        interaction.user.id,
                        message.id,
                        interaction
                    );
                    break;
            }

            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("setup::")) {
            const { message } = interaction;

            if (!message) {
                await interaction.reply({
                    content: `${emoji(this.application, "error")} The session has expired. Please run the command again.`,
                    ephemeral: true
                });

                return;
            }

            const [, guildId, id, subId] = interaction.customId.split("::");

            this.ping(guildId, interaction.user.id, message.id);

            if (id === "logging" && subId === "events_select") {
                await this.handleLoggingEventsUpdate(
                    guildId,
                    interaction.user.id,
                    message.id,
                    interaction
                );
                return;
            }
        }

        if (interaction.isButton() && interaction.customId.startsWith("setup::")) {
            const { message } = interaction;

            if (!message) {
                await interaction.reply({
                    content: `${emoji(this.application, "error")} The session has expired. Please run the command again.`,
                    ephemeral: true
                });

                return;
            }

            const [, guildId, id, subId] = interaction.customId.split("::");

            if (id === "cancel") {
                const { timeout } =
                    this.setupState.get(`${guildId}::${interaction.user.id}::${message.id}`) ?? {};

                if (timeout) {
                    clearTimeout(timeout);
                    this.setupState.delete(`${guildId}::${interaction.user.id}::${message.id}`);
                }

                await interaction
                    .update(this.cancelledOptions([]))
                    .catch(this.application.logger.error);
                return;
            }

            const state = this.setupState.get(`${guildId}::${interaction.user.id}::${message.id}`);

            if (!state) {
                return;
            }

            this.ping(guildId, interaction.user.id, message.id);

            let done = true;

            switch (id) {
                case "logging":
                    switch (subId) {
                        case "channel":
                            await this.handleLoggingChannelUpdate(
                                guildId,
                                interaction.user.id,
                                message.id,
                                interaction
                            );
                            break;
                        default:
                            done = false;
                    }
                    break;

                default:
                    done = false;
            }

            if (!done) {
                await interaction.deferUpdate().catch(this.application.logger.error);

                switch (id) {
                    case "back":
                        await this.goBack(guildId, interaction.user.id, message.id);
                        break;
                    case "finish":
                        this.finishSetup(guildId, interaction.user.id, message.id);
                        break;
                    case "logging":
                        switch (subId) {
                            case "enable":
                                await this.handleLoggingEnable(
                                    guildId,
                                    interaction.user.id,
                                    message.id,
                                    interaction
                                );
                                break;
                            case "events":
                                await this.handleLoggingEventsUpdateStart(
                                    guildId,
                                    interaction.user.id,
                                    message.id,
                                    interaction
                                );
                                break;
                        }

                        break;
                }
            }

            return;
        }

        if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith("setup::")) {
            return;
        }

        const { message } = interaction;

        if (!message) {
            await interaction.reply({
                content: `${emoji(this.application, "error")} The session has expired. Please run the command again.`,
                ephemeral: true
            });

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
        this.ping(guildId, interaction.user.id, message.id);

        await (
            this[handler] as (
                guildId: string,
                id: string,
                messageId: string,
                interaction: StringSelectMenuInteraction
            ) => Promise<void>
        ).call(this, guildId, interaction.user.id, message.id, interaction);
    }

    public async handlePrefixSetup(
        guildId: string,
        id: string,
        messageId: string,
        interaction: StringSelectMenuInteraction
    ) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

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

    private async defer(
        interaction: Extract<Interaction, { deferred: boolean; deferUpdate: unknown }>
    ) {
        if (interaction.deferred) {
            return;
        }

        await interaction.deferUpdate().catch(this.application.logger.error);
    }

    public async handleLoggingSetup(
        guildId: string,
        id: string,
        messageId: string,
        interaction: StringSelectMenuInteraction
    ) {
        this.resetState(guildId, id, messageId);

        const options = {
            embeds: [
                this.embed(
                    ["Logging"],
                    "To configure logging, please set up the following options.\nIf you've had configured logging before, this will overwrite the previous settings."
                )
            ],
            components: [
                this.selectMenu(guildId, true),
                this.loggingButtonRow(guildId),
                this.buttonRow(guildId, id, messageId, { cancel: true, back: true, finish: false })
            ]
        };

        await this.defer(interaction);
        await this.pushState(guildId, id, messageId, options);
    }

    private loggingButtonRow(
        guildId: string,
        { enable = true, channel = true, events = true } = {}
    ) {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`setup::${guildId}::logging::enable`)
                .setLabel("Enable Logging")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!enable),
            new ButtonBuilder()
                .setCustomId(`setup::${guildId}::logging::channel`)
                .setLabel("Set Logging Channel")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!channel),
            new ButtonBuilder()
                .setCustomId(`setup::${guildId}::logging::events`)
                .setLabel("Choose Events")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!events)
        );
    }

    private async handleLoggingEnable(
        guildId: string,
        id: string,
        messageId: string,
        interaction: ButtonInteraction
    ) {
        if (!this.configManager.config[guildId]) {
            this.configManager.autoConfigure(guildId);
        }

        const config = this.configManager.config[guildId];

        if (!config) {
            return;
        }

        await interaction.deferUpdate().catch(this.application.logger.error);
        const state = this.setupState.get(`${guildId}::${interaction.user.id}::${messageId}`);

        if (state) {
            state.finishable = true;
        }

        config.logging = this.defaultLoggingConfig();

        await this.configManager.write({ guild: true, system: false });
        await this.configManager.load();

        this.resetState(guildId, id, messageId, 2);

        await this.pushState(guildId, id, messageId, {
            embeds: [
                this.embed(
                    ["Logging"],
                    `${emoji(this.application, "check")} Enabled logging successfully. Please select a channel to log events to.`,
                    {
                        color: Colors.Success
                    }
                )
            ],
            components: [
                this.selectMenu(guildId, true),
                this.loggingButtonRow(guildId, { enable: false }),
                this.buttonRow(guildId, id, messageId, {
                    back: true,
                    cancel: true,
                    finish: true
                })
            ]
        });
    }

    private defaultLoggingConfig() {
        return {
            enabled: true,
            bulk_delete_send_json: true,
            default_enabled: true,
            exclusions: [],
            global_ignored_channels: [],
            hooks: {},
            overrides: [],
            unsubscribed_events: [],
            primary_channel: undefined
        };
    }

    private async handleLoggingChannelUpdateModalSubmit(
        guildId: string,
        id: string,
        messageId: string,
        interaction: ModalSubmitInteraction
    ) {
        if (!this.configManager.config[guildId]) {
            this.configManager.autoConfigure(guildId);
        }

        const config = this.configManager.config[guildId];

        if (!config) {
            return;
        }

        await interaction.deferUpdate().catch(this.application.logger.error);

        const channelId = interaction.fields.getTextInputValue("channel_id");
        const validationFailed = !channelId || !/^\d{17,21}$/.test(channelId);
        const channel = validationFailed ? undefined : await fetchChannel(guildId, channelId);

        this.resetState(guildId, id, messageId, 2);

        if (!channel?.isTextBased()) {
            await this.pushState(guildId, id, messageId, {
                embeds: [
                    this.embed(
                        ["Logging"],
                        `${emoji(this.application, "error")} Invalid channel ID. Please provide a channel ID and make sure it's a text channel.`,
                        {
                            color: Colors.Danger
                        }
                    )
                ],

                components: [
                    this.selectMenu(guildId, true),
                    this.loggingButtonRow(guildId, { enable: false }),
                    this.buttonRow(guildId, id, messageId, {
                        back: true,
                        cancel: true
                    })
                ]
            });

            return;
        }

        const me =
            channel.guild.members.me || (await fetchMember(channel.guild, channel.client.user.id));

        if (
            me &&
            !channel
                .permissionsFor(me)
                .has(
                    [
                        "SendMessages",
                        "EmbedLinks",
                        "AttachFiles",
                        "AddReactions",
                        "UseExternalEmojis"
                    ],
                    true
                )
        ) {
            await this.pushState(guildId, id, messageId, {
                embeds: [
                    this.embed(
                        ["Logging"],
                        `${emoji(this.application, "error")} The system does not have the required permissions to send messages in the selected channel. Please make sure the system has the following permissions: \`Send Messages\`, \`Embed Links\`, \`Attach Files\`, \`Add Reactions\`, \`Use External Emojis\`.`,
                        {
                            color: Colors.Danger
                        }
                    )
                ],

                components: [
                    this.selectMenu(guildId, true),
                    this.loggingButtonRow(guildId, { enable: false }),
                    this.buttonRow(guildId, id, messageId, {
                        back: true,
                        cancel: true
                    })
                ]
            });

            return;
        }

        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        if (state) {
            state.finishable = true;
        }

        config.logging ??= this.defaultLoggingConfig();
        config.logging.primary_channel = channel.id;

        await this.configManager.write({ guild: true, system: false });
        await this.configManager.load();

        await this.pushState(guildId, id, messageId, {
            embeds: [
                this.embed(
                    ["Logging"],
                    `${emoji(this.application, "check")} Updated the logging channel successfully. The new logging channel is <#${channel.id}>.\nChoose what events to log or press "Back" to return to the previous menu.`,
                    {
                        color: Colors.Success
                    }
                )
            ],
            components: [
                this.selectMenu(guildId, true),
                this.loggingButtonRow(guildId, { enable: false }),
                this.buttonRow(guildId, id, messageId, {
                    back: true,
                    cancel: true,
                    finish: true
                })
            ]
        });
    }

    private async handleLoggingChannelUpdate(
        guildId: string,
        id: string,
        messageId: string,
        interaction: ButtonInteraction
    ) {
        const state = this.setupState.get(`${guildId}::${id}::${messageId}`);

        if (!state) {
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`setup::${guildId}::logging_channel_modal`)
            .setTitle("Change Logging Channel")
            .setComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setLabel("Channel ID")
                        .setCustomId("channel_id")
                        .setPlaceholder("Enter a text channel ID")
                        .setMinLength(1)
                        .setMaxLength(128)
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(modal).catch(this.application.logger.error);
    }

    private getLoggingEvents() {
        return Object.keys(LogEventType).filter(key => /[A-Z]/.test(key));
    }

    private loggingEventsSelectRow(guildId: string) {
        return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`setup::${guildId}::logging::events_select`)
                .setPlaceholder("Select events to log")
                .setMinValues(1)
                .setMaxValues(this.getLoggingEvents().length)
                .addOptions(
                    this.getLoggingEvents().map(event => ({
                        label: event.replace(/[A-Z]/g, " $&"),
                        value: event
                    }))
                )
        );
    }

    private async handleLoggingEventsUpdateStart(
        guildId: string,
        id: string,
        messageId: string,
        _interaction: ButtonInteraction
    ) {
        this.resetState(guildId, id, messageId, 2);

        if (!this.configManager.config[guildId]?.logging?.enabled) {
            await this.pushState(guildId, id, messageId, {
                embeds: [
                    this.embed(
                        ["Logging", "Events"],
                        "Please enable logging first before configuring events.",
                        {
                            color: Colors.Danger
                        }
                    )
                ],
                components: [
                    this.selectMenu(guildId, true),
                    this.loggingButtonRow(guildId),
                    this.buttonRow(guildId, id, messageId, {
                        back: true,
                        cancel: true,
                        finish: false
                    })
                ]
            });

            return;
        }

        await this.pushState(guildId, id, messageId, {
            embeds: [
                this.embed(["Logging", "Events"], "Please select the events you want to log.", {
                    color: Colors.Primary
                })
            ],
            components: [
                this.selectMenu(guildId, true),
                this.loggingButtonRow(guildId, { enable: false, channel: false, events: false }),
                this.loggingEventsSelectRow(guildId),
                this.buttonRow(guildId, id, messageId, {
                    back: true,
                    cancel: true,
                    finish: true
                })
            ]
        });
    }

    private async handleLoggingEventsUpdate(
        guildId: string,
        id: string,
        messageId: string,
        interaction: StringSelectMenuInteraction
    ) {
        if (!interaction.deferred) {
            await interaction.deferUpdate();
        }

        this.resetState(guildId, id, messageId, 2);

        if (!this.configManager.config[guildId]?.logging?.enabled) {
            await this.pushState(guildId, id, messageId, {
                embeds: [
                    this.embed(
                        ["Logging", "Events", "Update"],
                        "Please enable logging first before configuring events.",
                        {
                            color: Colors.Danger
                        }
                    )
                ],
                components: [
                    this.selectMenu(guildId, true),
                    this.loggingButtonRow(guildId),
                    this.buttonRow(guildId, id, messageId, {
                        back: true,
                        cancel: true,
                        finish: false
                    })
                ]
            });

            return;
        }

        this.configManager.config[guildId].logging.unsubscribed_events = this.getLoggingEvents()
            .filter(
                (event): event is keyof typeof LogEventType =>
                    !interaction.values.includes(event) && event in LogEventType
            )
            .map(event => LogEventType[event]);
        await this.configManager.write({ guild: true, system: false });

        await this.pushState(guildId, id, messageId, {
            embeds: [
                this.embed(
                    ["Logging", "Events", "Update"],
                    `${emoji(this.application, "check")} Successfully updated the log events.`,
                    {
                        color: Colors.Success
                    }
                )
            ],
            components: [
                this.selectMenu(guildId, true),
                this.loggingButtonRow(guildId, { enable: false, channel: true, events: true }),
                this.buttonRow(guildId, id, messageId, {
                    back: true,
                    cancel: true,
                    finish: true
                })
            ]
        });
    }

    public async handleAIAutoModSetup(
        guildId: string,
        id: string,
        messageId: string,
        interaction: StringSelectMenuInteraction
    ) {
        await this.defer(interaction);
        this.resetState(guildId, id, messageId);

        if (this.configManager.config[guildId]?.ai_automod?.enabled) {
            await this.pushState(guildId, id, messageId, {
                embeds: [
                    this.embed(["AI AutoMod"], "AI AutoMod is already enabled!", {
                        color: Colors.Danger
                    })
                ],
                components: [
                    this.selectMenu(guildId, true),
                    this.buttonRow(guildId, id, messageId, {
                        back: true,
                        cancel: true,
                        finish: false
                    })
                ]
            });

            return;
        }

        this.configManager.config[guildId] = {} as (typeof this.configManager.config)[string];
        this.configManager.config[guildId]!.ai_automod ??= AIAutoModSchema.parse({
            enabled: true,
            automatic_actions: {
                enabled: true
            }
        });
        this.configManager.config[guildId]!.ai_automod.enabled = true;
        await this.configManager.write({ guild: true, system: false });

        await this.pushState(guildId, id, messageId, {
            embeds: [
                this.embed(["AI AutoMod"], "AI AutoMod has been enabled.", {
                    color: Colors.Success
                })
            ],
            components: [
                this.selectMenu(guildId, true),
                this.buttonRow(guildId, id, messageId, {
                    back: true,
                    cancel: true,
                    finish: true
                })
            ]
        });
    }
}

export default GuildSetupService;
