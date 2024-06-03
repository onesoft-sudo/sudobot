import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Pagination from "@framework/pagination/Pagination";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import SnippetManagerService from "@main/services/SnippetManagerService";

class SnippetListCommand extends Command {
    public override readonly name = "snippet::list";
    public override readonly description: string =
        "Lists all the available snippets in this server.";
    public override readonly defer = true;
    public override readonly usage = [""];
    public override readonly aliases = ["snippet::ls"];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.BanMembers
    ];
    public override readonly permissionCheckingMode = "or";

    @Inject()
    private readonly snippetManagerService!: SnippetManagerService;

    public override async execute(context: Context): Promise<void> {
        const snippets = await this.snippetManagerService.getSnippets(context.guildId);

        if (snippets.length === 0) {
            await context.error("No snippets found.");
            return;
        }

        const pagination = Pagination.withData(snippets)
            .setLimit(20)
            .setMaxTimeout(Pagination.DEFAULT_TIMEOUT)
            .setMessageOptionsBuilder(({ data, maxPages, page }) => {
                let description = "";

                for (const snippet of data) {
                    description += `\`${snippet.name}\`, `;
                }

                description = description.slice(0, -2);

                return {
                    embeds: [
                        {
                            author: {
                                name: `Snippets in ${context.guild?.name}`,
                                icon_url: context.guild?.iconURL() ?? undefined
                            },
                            description,
                            color: 0x00ff00,
                            footer: {
                                text: `Page ${page} of ${maxPages} • ${snippets.length} snippets total`
                            }
                        }
                    ]
                };
            });

        const message = await context.reply(await pagination.getMessageOptions());
        pagination.setInitialMessage(message);
    }
}

export default SnippetListCommand;
