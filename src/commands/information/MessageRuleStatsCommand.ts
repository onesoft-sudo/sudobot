import { formatDistanceToNowStrict } from "date-fns";
import { CommandInteraction, Message, Util } from "discord.js";
import DiscordClient from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import BlockedWordViolation from "../../models/BlockedWordViolation";
import { BlockedWordType } from "../../types/BlockedWordType";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";

// TODO
export default class MessageRuleStatsCommand extends BaseCommand {
    name = "messagerulestats";
    group = "information";
    aliases = [];
    supportsInteractions = true;

    async run(client: DiscordClient, interaction: CommandInteraction, options: InteractionOptions): Promise<void> {
        const user = interaction.options.getUser('user') ?? undefined;
        const word_token = interaction.options.getString('word_or_token') ?? undefined;

        if (!user && !word_token) {
            await interaction.reply(`${emoji('error')} You must specify a user or a word/token to search!`);
            return;
        }

        await interaction.deferReply();

        if (user && word_token) {
            const data = await BlockedWordViolation.findOne({
                guild_id: interaction.guild!.id,
                user_id: user.id,
                word_token,
            });

            await interaction.editReply({
                embeds: [
                    new MessageEmbed({
                        author: {
                            iconURL: user.displayAvatarURL(),
                            name: user.tag
                        },
                        description: `This user has sent **${data?.count ?? 0}** messages total that contained the word/token: ||${Util.escapeMarkdown(word_token)}||. ${!data ? '' : `This word was last used by this user ${formatDistanceToNowStrict(data.updatedAt, { addSuffix: true })}`}.`,
                        fields: [
                            {
                                name: 'Suggested action',
                                value: (data?.count ?? 0) < 20 ? 'No action needed' : (
                                    (data?.count ?? 0) >= 20 && (data?.count ?? 0) < 50 ? 'Warning' : (
                                        (data?.count ?? 0) >= 50 && (data?.count ?? 0) < 80 ? 'Mute' : 'Ban/Kick'
                                    )
                                )
                            },
                            ...(data ? [
                                {
                                    name: 'Rule type',
                                    value: data.type === BlockedWordType.WORD ? 'Word' : 'Token'
                                }
                            ] : [])
                        ]
                    })
                ]
            });
        }
    }
}