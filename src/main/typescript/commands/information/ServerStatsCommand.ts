import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";

class ServerStatsCommand extends Command {
    public override readonly name = "stats";
    public override readonly description: string = "Show server statistics.";
    public override readonly defer = true;
    public override readonly usage = [""];
    public override readonly systemPermissions = [];

    public override build(): Buildable[] {
        return [this.buildChatInput()];
    }

    public override async execute(context: Context): Promise<void> {
        const memberCount =
            context.guild!.members.cache.size > context.guild!.memberCount
                ? context.guild!.members.cache.size
                : context.guild!.memberCount;
        let botCount = 0,
            humanCount = 0;

        for (const member of context.guild!.members.cache.values()) {
            if (member.user.bot) botCount++;
            else humanCount++;
        }

        const channelCount = context.guild!.channels.cache.size;
        const roleCount = context.guild!.roles.cache.size;

        await context.reply({
            embeds: [
                {
                    color: 0x007bff,
                    author: {
                        name: `Statistics of ${context.guild!.name}`,
                        icon_url: context.guild!.iconURL() ?? undefined
                    },
                    fields: [
                        {
                            name: "Total members",
                            value: `${memberCount}`,
                            inline: true
                        },
                        {
                            name: "Human members",
                            value: `${humanCount}`,
                            inline: true
                        },
                        {
                            name: "Bots",
                            value: `${botCount}`,
                            inline: true
                        },
                        {
                            name: "Is Discoverable",
                            value: `${context.guild?.features.includes("DISCOVERABLE") ? "Yes" : "No"}`
                        },
                        {
                            name: "Roles",
                            value: `${roleCount}`,
                            inline: true
                        },
                        {
                            name: "Channels",
                            value: `${channelCount}`,
                            inline: true
                        }
                    ],
                    footer: {
                        text:
                            memberCount >= 60
                                ? "Your server is growing!"
                                : "Put some work and invite more people to grow your community!"
                    }
                }
            ]
        });
    }
}

export default ServerStatsCommand;
