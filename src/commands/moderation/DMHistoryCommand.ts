import { Message, CacheType, CommandInteraction, User, Util } from "discord.js";
import DiscordClient from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { fetchEmoji } from "../../utils/Emoji";
import ModerationHistoryGenerator from "../../utils/ModerationHistoryGenerator";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class DMHistoryCommand extends BaseCommand {
    name = "dmhistory";
    category = "moderation";
    aliases = ["historyreq", "sendlogs", "dmlogs"];
    coolDown = 1000 * 60 * 5;
    supportsInteractions = true;

    async run(client: DiscordClient, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (message instanceof CommandInteraction) {
            await message.deferReply({ ephemeral: true });
        }
        
        const user = message.member!.user as User;
        const historyGenerator = new ModerationHistoryGenerator(user, message.guild!);
        const { dmStatus, size } = await historyGenerator.generate(true);

        await this.deferReply(message, {
            content: `${dmStatus ? `${fetchEmoji("check")} The system has sent a DM to you. Sent ${size} records total.` : "The system was unable to deliver a DM to you because you have DMs disabled."}`,
        });

        await historyGenerator.removeTempFile();
    }
}