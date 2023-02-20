import { Message, Interaction, CommandInteraction, Util, GuildMemberRoleManager } from "discord.js";
import DiscordClient from "../../client/Client";
import SpamViolation from "../../models/SpamViolation";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import getUser from "../../utils/getUser";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class SpamViolationResetCommand extends BaseCommand {
    name = 'spamviolationreset';
    category = 'moderation';
    aliases = ['spamreset', 'svreset'];

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!(message.member?.roles as GuildMemberRoleManager).cache.has(client.config.props[message.guildId!].admin)) {
            await message.reply(`${emoji('error')} You don't have permission to run this command.`);
            return;
        }

        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(`${emoji('error')} You must specify a user.`);
            return;
        }

        const user = options.isInteraction ? options.options.getUser('user') : (await getUser(client, message as Message, options, 0));
        
        if (!user) {
            await message.reply(`${emoji('error')} That user does not exist.`);
            return;
        }

        const { deletedCount } = await SpamViolation.deleteMany({
            user_id: user.id,
            guild_id: message.guildId!
        });

        await message.reply(`${emoji('check')} Cleared **${deletedCount}** records for user **${Util.escapeMarkdown(user.tag)}**.`);
    }
}