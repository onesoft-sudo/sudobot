import { userMention } from "@discordjs/builders";
import { Message, Util } from "discord.js";
import DiscordClient from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import Pagination from "../../utils/Pagination";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class StaffAwayCommand extends BaseCommand {
    constructor() {
        super('staffawaylist', 'utils', ['safklist', 'sawaylist', 'awaylist']);
    }

    async run(client: DiscordClient, message: Message, options: CommandOptions) {
        const pagination = new Pagination(client.utils.staffAwayList, {
            channel_id: message.channelId!,
            guild_id: message.guildId!,
            limit: 2,
            timeout: 180_000,
            user_id: message.author.id,
            embedBuilder(options) {
                let description = '';

                for (const entry of options.data) {
                    description += `User: ${userMention(entry.user)}\n`;
                    description += `Reason: ${Util.escapeMarkdown(entry.reason ?? 'No reason provided')}\n\n`;
                }

                return new MessageEmbed({
                    author: {
                        name: "Staff Break List"
                    },
                    description,
                    footer: {
                        text: `Page ${options.currentPage} of ${options.maxPages} • ${client.utils.staffAwayList.length} records total`
                    }
                });
            },
        });

        const reply = await message.reply(await pagination.getMessageOptions());
        pagination.start(reply!).catch(console.error);        
    }
}