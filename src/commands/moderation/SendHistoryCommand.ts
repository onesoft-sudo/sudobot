import { Message, CacheType, CommandInteraction, User, Util } from "discord.js";
import DiscordClient from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { fetchEmoji } from "../../utils/Emoji";
import getUser from "../../utils/getUser";
import ModerationHistoryGenerator from "../../utils/ModerationHistoryGenerator";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class SendHistoryCommand extends BaseCommand {
    name = "sendhistory";
    category = "moderation";
    aliases = ["histories", "dlhistory"];
    supportsInteractions = true;

    async run(client: DiscordClient, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            message.reply(`${fetchEmoji('error')} You must specify a user to DM them their moderation history.`);
            return;
        }

        let user: User;
        const sendDM = options.isInteraction ? options.options.getBoolean("send_dm") ?? false : options.args.includes("--dm");

        if (options.isInteraction) {
            await (message as CommandInteraction).deferReply({ ephemeral: true });
            user = await options.options.getUser('user', true);
        }
        else {
            const tmpuser = await getUser(client, (message as Message), options);

            if (!tmpuser) {
                await message.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`${fetchEmoji('error')} Invalid user given.`)
                    ]
                });
    
                return;
            }

            user = tmpuser;
        }

        const historyGenerator = new ModerationHistoryGenerator(user, message.guild!);
        const { dmStatus, size, tmpFilePath } = await historyGenerator.generate(sendDM);

        await this.deferReply(message, {
            content: `${fetchEmoji("check")} Moderation history of ${Util.escapeMarkdown(user.tag)} is ready! ${size} records total.${(!dmStatus && sendDM) ? "\nThe system was unable to deliver a DM to the user because they don't share servers with the bot or they have DMs disabled." : ""}`,
            files: [
                {
                    name: `history-${user.id}.txt`,
                    attachment: tmpFilePath
                }
            ],
        });

        await historyGenerator.removeTempFile();
    }
}