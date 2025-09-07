import { type Buildable, Command } from "@framework/commands/Command";
import InteractionContext from "@framework/commands/InteractionContext";
import LegacyContext from "@framework/commands/LegacyContext";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { fetchChannel } from "@framework/utils/entities";
import { GuildConfigSchema } from "@sudobot/schemas/GuildConfigSchema";
import type ConfigurationManager from "@sudobot/services/ConfigurationManager";
import {
    ChannelType,
    type ChatInputCommandInteraction,
    escapeMarkdown,
    type Snowflake,
    PermissionFlagsBits
} from "discord.js";
import { eq } from "drizzle-orm";
import { countingEntries } from "../models/CountingEntry";
import type { CountingConfig } from "../schemas/CountingConfigSchema";
import type { ExtendedGuildConfig } from "../types/Config";
import { castDrizzle } from "../utils/castDrizzle";

const CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.PublicThread,
    ChannelType.PrivateThread,
    ChannelType.AnnouncementThread,
    ChannelType.GuildAnnouncement
] as const;

class CountCommand extends Command {
    public override readonly name = "count";
    public override readonly description = "Configure counting";
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly subcommands = ["enable", "set", "reset", "channel", "hardcore"];
    public override readonly isolatedSubcommands = false;
    public override readonly subcommandMeta = {
        enable: {
            description: "Enable or disable counting"
        },
        set: {
            description: "Set the current count manually"
        },
        reset: {
            description: "Reset count back to zero"
        },
        channel: {
            description: "Set a counting channel"
        },
        hardcore: {
            description: "Enable or disable hardcore mode"
        }
    };

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("enable")
                        .setDescription(this.subcommandMeta.enable.description)
                        .addBooleanOption(option =>
                            option.setName("enable").setDescription("Whether to enable counting").setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("set")
                        .setDescription(this.subcommandMeta.set.description)
                        .addIntegerOption(option =>
                            option.setName("count").setDescription("The count to set").setMinValue(0).setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName("reset").setDescription(this.subcommandMeta.reset.description)
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("channel")
                        .setDescription(this.subcommandMeta.channel.description)
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("The channel to set as default for counting")
                                .setRequired(true)
                                .addChannelTypes(...CHANNEL_TYPES)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("hardcore")
                        .setDescription(this.subcommandMeta.hardcore.description)
                        .addBooleanOption(option =>
                            option.setName("enable").setDescription("Whether to enable hardcore mode").setRequired(true)
                        )
                )
        ];
    }

    public override async execute(context: LegacyContext | InteractionContext<ChatInputCommandInteraction>) {
        const subcommand = context.isChatInput() ? context.options.getSubcommand(true) : context.args[0];

        if (!subcommand) {
            await context.error(
                "A subcommand must be provided. Available subcommands are: " + this.subcommands.join(" ") + "."
            );
            return;
        }

        const drizzle = castDrizzle(this.application.database);

        switch (subcommand) {
            case "enable":
                {
                    const enableValue = context.isChatInput()
                        ? context.options.getBoolean("enable", true)
                        : context.args[1]?.toLowerCase() === "true";

                    if (
                        context.isLegacy() &&
                        context.args[1]?.toLowerCase() !== "true" &&
                        context.args[1]?.toLowerCase() !== "false"
                    ) {
                        await context.error(
                            "A boolean value must be given as argument and the given value must be a valid boolean: either 'true' or 'false'."
                        );
                        return;
                    }

                    if (enableValue) {
                        await drizzle.insert(countingEntries).values({
                            guildId: context.guildId
                        });
                    } else {
                        await drizzle.delete(countingEntries).where(eq(countingEntries.guildId, context.guildId));
                    }

                    await this.setConfig(context.guildId, config => (config.enabled = enableValue));
                    await context.success(`${enableValue ? "Enabled" : "Disabled"} counting.`);
                }
                break;

            case "set":
                {
                    const count = context.isChatInput()
                        ? context.options.getInteger("count", true)
                        : context.args[1]
                          ? +context.args[1]
                          : null;

                    if (context.isLegacy() && (count === null || Number.isNaN(count) || count < 0)) {
                        await context.error(
                            "An integer value (count) must be given and the value must be a valid positive integer or zero."
                        );

                        return;
                    }

                    await drizzle
                        .update(countingEntries)
                        .set({
                            count: count ?? 0
                        })
                        .where(eq(countingEntries.guildId, context.guildId));

                    await context.success(`Changed current count to ${count}.`);
                }
                break;

            case "reset":
                {
                    await drizzle
                        .update(countingEntries)
                        .set({
                            count: 0
                        })
                        .where(eq(countingEntries.guildId, context.guildId));

                    await context.success(`Reset the current count back to 0.`);
                }
                break;

            case "channel":
                {
                    const channel = context.isChatInput()
                        ? context.options.getChannel("channel", true)
                        : context.args[1];
                    let channelId: string | null = null;

                    if (context.isLegacy()) {
                        if (!channel) {
                            await context.error("A channel must be provided!");
                            return;
                        }

                        const channelString = channel as string;
                        const fetchedChannel = await fetchChannel(
                            context.guild,
                            channelString.startsWith("<#") && channelString.endsWith(">")
                                ? channelString.slice(2, -1)
                                : channelString
                        );

                        if (!fetchedChannel) {
                            await context.error("The given channel could not be found.");
                            return;
                        }

                        if (!CHANNEL_TYPES.includes(fetchedChannel.type as (typeof CHANNEL_TYPES)[number])) {
                            await context.error("The given channel is not a valid text channel.");
                            return;
                        }

                        if (
                            !fetchedChannel
                                .permissionsFor(this.application.client.user!.id, true)
                                ?.has([PermissionFlags.AddReactions, PermissionFlags.ManageMessages])
                        ) {
                            await context.error(
                                "The system is missing the following permissions in the given channel: Add reactions, Manage Messages"
                            );
                            return;
                        }

                        channelId = fetchedChannel.id;
                    }

                    await this.setConfig(context.guildId, config => (config.channel = channelId!));
                    await context.success(`Changed counting channel to <#${channelId}>.`);
                }
                break;

            case "hardcore":
                {
                    const enableValue = context.isChatInput()
                        ? context.options.getBoolean("enable", true)
                        : context.args[1]?.toLowerCase() === "true";

                    if (
                        context.isLegacy() &&
                        context.args[1]?.toLowerCase() !== "true" &&
                        context.args[1]?.toLowerCase() !== "false"
                    ) {
                        await context.error(
                            "A boolean value must be given as argument and the given value must be a valid boolean: either 'true' or 'false'."
                        );
                        return;
                    }

                    await this.setConfig(context.guildId, config => (config.hardcore = enableValue));
                    await context.success(`${enableValue ? "Enabled" : "Disabled"} hardcore mode.`);
                }
                break;

            default:
                await context.error(
                    `Invalid subcommand: ${escapeMarkdown(subcommand)}. Valid subcommands are: ${this.subcommands.join(" ")}.`
                );
                break;
        }
    }

    private async setConfig(guildId: Snowflake, setter: (config: CountingConfig) => void) {
        const config = (this.configManager.config[guildId] as ExtendedGuildConfig | undefined)?.counting || {
            enabled: false,
            channel: "",
            hardcore: false
        };

        setter(config);

        if (!this.configManager.config[guildId]) {
            this.configManager.config[guildId] = GuildConfigSchema.parse({});
        }

        (this.configManager.config[guildId] as ExtendedGuildConfig).counting = config;
        await this.configManager.write({ guild: true, system: false });
    }
}

export default CountCommand;
