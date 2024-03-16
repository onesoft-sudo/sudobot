import { ChatContext, Command } from "../../framework/commands/Command";

class AboutCommand extends Command {
    public override readonly name = "about";
    public override readonly description = "Get information about the bot.";
    public override readonly aliases = ["botinfo"];

    public override async execute(context: ChatContext) {
        await context.reply({
            embeds: [
                {
                    author: {
                        icon_url: this.client.user?.displayAvatarURL(),
                        name: "SudoBot"
                    },
                    description: `
                        __**A free and open source Discord moderation bot**__.\n
                        This bot is free software, and you are welcome to redistribute it under certain conditions.
                        See the [GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html) for more detailed information.
                    `.replaceAll(/\n([ \t]+)/gm, "\n"),
                    color: 0x007bff,
                    fields: [
                        {
                            name: "Version",
                            value: `${this.client.metadata.version}`,
                            inline: true
                        },
                        {
                            name: "Source Code",
                            value: `[GitHub](${this.client.metadata.repository.url})`,
                            inline: true
                        },
                        {
                            name: "Licensed Under",
                            value: "[GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0.en.html)",
                            inline: true
                        },
                        {
                            name: "Author",
                            value: `[${this.client.metadata.author.name}](${this.client.metadata.author.url})`,
                            inline: true
                        },
                        {
                            name: "Support",
                            value: "rakinar2@onesoftnet.eu.org",
                            inline: true
                        }
                    ],
                    footer: {
                        text: `Copyright © OSN Developers 2022-${new Date().getFullYear()}. All rights reserved.`
                    }
                }
            ]
        });
    }
}

export default AboutCommand;
