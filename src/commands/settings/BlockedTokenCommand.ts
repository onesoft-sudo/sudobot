import { CommandInteraction, Message } from "discord.js";
import DiscordClient from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import { emoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class BlockedTokenCommand extends BaseCommand {
    name = "blockedtoken";
    group = "settings";
    aliases = ["btoken", "blockedtokens", "bannedtoken", "bannedtoken", "bantoken", "unbantoken", "blocktoken", "unblocktoken"];
    supportsInteractions = 'true';

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const subcommand = options.isInteraction ? options.options.getSubcommand(true) : (
            options.argv[0] === 'bantoken' ||  options.argv[0] === 'blocktoken' ? 'add' : (
                options.argv[0] === 'unbantoken' ||  options.argv[0] === 'unblocktoken' ? 'remove' : options.argv[1]
            )
        );

        const subcommands = ["add", "remove", "has"];

        if (!subcommand) {
            await message.reply(`${emoji('error')} You must provide a subcommand with this command. The valid subcommands are: \`${subcommands.join('`, `')}\`.`);
            return;
        }

        if (!subcommands.includes(subcommand)) {
            await this.deferReply(message, `${emoji('error')} Invalid subcommand provided. The valid subcommands are: \`${subcommands.join('`, `')}\`.`);
            return;
        }

        if (!options.isInteraction && options.argv[2] === undefined) {
            await message.reply(`${emoji('error')} You must specify a token ${subcommand === 'add' ? 'to block' : (subcommand === 'remove' ? 'to remove' : 'to check')}!`);
            return;
        }

        if (message instanceof CommandInteraction) {
            await message.deferReply();
        }

        switch (subcommand) {
            case 'add':
                if (!options.isInteraction) {
                    options.args.shift();
                }

                const tokenToBlock = message instanceof Message ? message.content.slice(client.config.get('prefix').length).trim() : message.options.getString('token', true);

                if (client.config.props[message.guildId!]?.filters.tokens.includes(tokenToBlock)) {
                    await this.deferReply(message, `${emoji('error')} The given token is already blocked.`);
                    return;
                }

                client.config.props[message.guildId!]?.filters.tokens.push(tokenToBlock);
                client.config.write();

                await this.deferReply(message, `${emoji('check')} The given token has been blocked.`);
            break;

            case 'has':
                const token = !options.isInteraction ? options.argv[2] : options.options.getString('token', true);

                if (client.config.props[message.guildId!]?.filters.tokens.includes(token)) {
                    await this.deferReply(message, `${emoji('check')} This token is in the blocklist.`);
                    return;
                }
                else {
                    await this.deferReply(message, `${emoji('error')} This token is not in the blocklist.`);
                    return;
                }
            break;

            case 'remove':
                const tokenToUnblock = message instanceof Message ? message.content.slice(client.config.get('prefix').length).trim() : message.options.getString('token', true);

                const index = client.config.props[message.guildId!]?.filters.tokens.indexOf(tokenToUnblock);

                if (index === -1) {
                    await this.deferReply(message, `${emoji('error')} The given token was not blocked.`);
                    return;
                }

                client.config.props[message.guildId!]?.filters.tokens.splice(index, 1);
                
                client.config.write();
                await this.deferReply(message, `${emoji('check')} The given token has been unblocked.`);
            break;
        }
    }
}