import { Buildable, Command } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import InteractionContext from "@framework/commands/InteractionContext";
import LegacyContext from "@framework/commands/LegacyContext";
import { Inject } from "@framework/container/Inject";
import AFKService from "@main/services/AFKService";
import { ChatInputCommandInteraction, escapeMarkdown, italic } from "discord.js";

// TODO: Pagination
class AFKsCommand extends Command {
    public override readonly name = "afks";
    public override readonly description: string = "Manage others' AFK statuses.";
    public override readonly usage = ["[...reason: RestString]"];
    public override readonly aliases = ["manageafks"];
    public override readonly subcommands = ["list", "remove"];

    @Inject()
    private readonly afkService!: AFKService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand.setName("list").setDescription("List all users with AFK statuses.")
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

    private async removeAFK(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const userId = context.isChatInput()
            ? context.options.getUser("user", true).id
            : context.args[1];

        const afk =
            this.afkService.cache.get(`global::${userId}`) ||
            this.afkService.cache.get(`${context.guildId}::${userId}`);

        if (!afk) {
            await context.reply("That user is not currently AFK.");
            return;
        }

        const ids: number[] = [];

        if (this.afkService.cache.get(`global::${userId}`)) {
            ids.push(this.afkService.cache.get(`global::${userId}`)!.id);
        }

        if (this.afkService.cache.get(`${context.guildId}::${userId}`)) {
            ids.push(this.afkService.cache.get(`${context.guildId}::${userId}`)!.id);
        }

        await this.application.prisma.afkEntry.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        });

        this.afkService.cache.delete(`global::${userId}`);
        this.afkService.cache.delete(`${context.guildId}::${userId}`);

        await context.success({
            content: `Removed AFK status for <@${userId}>.`,
            allowedMentions: { parse: [], users: [], roles: [] }
        });
    }
}

export default AFKsCommand;
