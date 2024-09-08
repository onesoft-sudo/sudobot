import { Buildable, Command } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import InteractionContext from "@framework/commands/InteractionContext";
import LegacyContext from "@framework/commands/LegacyContext";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { afkEntries } from "@main/models/AFKEntry";
import AFKService from "@main/services/AFKService";
import PermissionManagerService from "@main/services/PermissionManagerService";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Colors,
    ComponentType,
    escapeMarkdown,
    italic
} from "discord.js";
import { inArray } from "drizzle-orm";

// TODO: Pagination
class AFKsCommand extends Command {
    public override readonly name = "afks";
    public override readonly description: string = "Manage others' AFK statuses.";
    public override readonly usage = ["<subcommand: String> [...args: Any[]]"];
    public override readonly aliases = ["manageafks"];
    public override readonly subcommands = ["list", "remove", "clear"];
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly subcommandMeta = {
        list: {
            description: "List all users with AFK statuses."
        },
        remove: {
            description: "Remove a user's AFK status.",
            usage: ["<user: User>", "[...reason: RestString]"]
        },
        clear: {
            description: "Clear all AFK statuses in this server."
        }
    };

    @Inject()
    private readonly afkService!: AFKService;

    @Inject()
    private readonly permissionManagerService!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand.setName("list").setDescription("List all users with AFK statuses.")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("clear")
                        .setDescription("Clear all AFK statuses in this server")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Remove a user's AFK status.")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("The user to remove the AFK status for.")
                                .setRequired(true)
                        )
                )
        ];
    }

    public override async execute(
        context: InteractionContext<ChatInputCommandInteraction> | LegacyContext
    ): Promise<void> {
        const subcommand = context.isChatInput()
            ? context.options.getSubcommand(true)
            : context.args[0];

        if (subcommand === "list") {
            await this.listAFKs(context);
        } else if (subcommand === "remove") {
            await this.removeAFK(context);
        } else if (subcommand === "clear") {
            await this.clearAFKs(context);
        }
    }

    private async listAFKs(context: Context): Promise<void> {
        const afks = this.afkService.cache;

        if (afks.size === 0) {
            await context.reply({
                content: "No users are currently AFK."
            });

            return;
        }

        let list = "";

        for (const afk of afks.values()) {
            list += `<@${afk.userId}> - \`${afk.userId}\` - ${afk.reason ? escapeMarkdown(afk.reason) : italic("No reason provided")}\n`;
        }

        await context.reply({
            content: list || "No users are currently AFK.",
            allowedMentions: { parse: [], users: [], roles: [] }
        });
    }

    private async clearAFKs(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const entryCount = this.afkService.cache.filter(
            afk => afk.guildId === context.guildId
        ).size;

        if (entryCount === 0) {
            await context.error("No user is AFK at the moment in this server.");
            return;
        }

        const reply = await context.reply({
            embeds: [
                {
                    author: {
                        name: "Clear AFK statuses",
                        icon_url: context.guild?.iconURL() ?? undefined
                    },
                    description: `Are you sure you want to perform this action? This will affect **${entryCount}** user(s).`,
                    color: 0x007bff
                }
            ],
            components: [this.buildAFKClearActionRow()]
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            dispose: true,
            time: 60_600,
            filter: interaction =>
                interaction.customId.startsWith("afkclear_") &&
                interaction.user.id === context.member?.user.id
        });

        collector.on("collect", async interaction => {
            await interaction.deferUpdate();

            if (interaction.customId === "afkclear_cancel") {
                collector.stop("cancelled");
                return;
            }

            const count = await this.afkService.removeGuildAFKs(context.guildId!);

            await reply.edit({
                embeds: [
                    {
                        author: {
                            name: "Clear AFK statuses",
                            icon_url: context.guild?.iconURL() ?? undefined
                        },
                        description: `${context.emoji(
                            "check"
                        )} Operation completed successfully. **${count}** user(s) are affected.`.trimStart(),
                        color: Colors.Green
                    }
                ],
                components: [this.buildAFKClearActionRow(true)]
            });

            collector.stop("completed");
        });

        collector.on("end", async () => {
            if (collector.endReason === "completed") {
                return;
            }

            await reply.edit({
                embeds: [
                    {
                        author: {
                            name: "Clear AFK statuses",
                            icon_url: context.guild?.iconURL() ?? undefined
                        },
                        description: `Operation Cancelled${collector.endReason === "cancelled" ? "" : " due to inactivity"}.`,
                        color: Colors.Red
                    }
                ],
                components: [this.buildAFKClearActionRow(true)]
            });
        });
    }

    private async removeAFK(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const userId = context.isChatInput()
            ? context.options.getUser("user", true).id
            : context.args[1];
        const moderatorIsSystemAdmin = context.member
            ? await this.permissionManagerService.isSystemAdmin(context.member)
            : false;

        const afk =
            this.afkService.cache.get(`global::${userId}`) ||
            this.afkService.cache.get(`${context.guildId}::${userId}`);

        if (!afk) {
            await context.error("That user is not currently AFK.");
            return;
        }

        if (
            !moderatorIsSystemAdmin &&
            afk.global &&
            !this.afkService.cache.has(`${context.guildId}::${userId}`)
        ) {
            await context.error("You do not have permission to remove a global AFK status.");
            return;
        }

        const ids: number[] = [];

        if (moderatorIsSystemAdmin && this.afkService.cache.get(`global::${userId}`)) {
            ids.push(this.afkService.cache.get(`global::${userId}`)!.id);
        }

        if (this.afkService.cache.get(`${context.guildId}::${userId}`)) {
            ids.push(this.afkService.cache.get(`${context.guildId}::${userId}`)!.id);
        }

        await this.application.database.drizzle
            .delete(afkEntries)
            .where(inArray(afkEntries.id, ids));

        this.afkService.cache.delete(`global::${userId}`);
        this.afkService.cache.delete(`${context.guildId}::${userId}`);

        await context.success({
            content: `Removed AFK status for <@${userId}>.`,
            allowedMentions: { parse: [], users: [], roles: [] }
        });
    }

    private buildAFKClearActionRow(disabled = false) {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setDisabled(disabled)
                .setCustomId("afkclear_cancel")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setDisabled(disabled)
                .setCustomId("afkclear_continue")
                .setLabel("Continue")
                .setStyle(ButtonStyle.Secondary)
        );
    }
}

export default AFKsCommand;
