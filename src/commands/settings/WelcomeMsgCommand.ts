import { Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import { emoji } from '../../utils/Emoji';

export default class WelcomeMsgCommand extends BaseCommand {
    constructor() {
        super('welcomemsg', 'settings', ['welcomer']);
    }

    async run(client: DiscordClient, message: Message, options: CommandOptions) {
        if (options.args[0] === undefined) {
            await message.reply(`${emoji('error')} This command requires at least one argument or option.`);
            return;
        }

        if (options.options.includes('--enable')) {
            client.config.props[message.guild!.id].welcomer.enabled = true;
            await message.reply(`${emoji('check')} Welcomer has been enabled.`);
        }
        else if (options.options.includes('--disable')) {
            client.config.props[message.guild!.id].welcomer.enabled = false;
            await message.reply(`${emoji('check')} Welcomer has been disabled.`);
        }
        else if (options.options.includes('--toggle')) {
            client.config.props[message.guild!.id].welcomer.enabled = !client.config.props[message.guild!.id].welcomer.enabled;
            await message.reply(`${emoji('check')} Welcomer has been ${client.config.props[message.guild!.id].welcomer.enabled ? 'enabled' : 'disabled'}.`);
        }
        else if (options.options.includes('--msg') || options.options.includes('--message') || options.options.includes('--custom')) {
            let msg = options.args.filter(a => a !== '--msg' && a !== '--message' && a !== '--custom').join(' ');

            if (msg.trim() === '') {
                client.config.props[message.guild!.id].welcomer.message = null;
                await message.reply(`${emoji('check')} Welcome message was successfully removed.`);
            }
            else {
                client.config.props[message.guild!.id].welcomer.message = msg;
                await message.reply(`${emoji('check')} Welcome message was successfully set.`);
            }
        }
        else if (options.options.includes('--rm-msg') || options.options.includes('--remove-message')) {
            client.config.props[message.guild!.id].welcomer.message = null;
            await message.reply(`${emoji('check')} Welcome message was successfully removed.`);
        }
        else if (options.options.includes('--randomize') || options.options.includes('--rand')) {
            client.config.props[message.guild!.id].welcomer.randomize = !client.config.props[message.guild!.id].welcomer.randomize;
            await message.reply(`${emoji('check')} Welcomer random messages are ${client.config.props[message.guild!.id].welcomer.randomize ? 'enabled' : 'disabled'}.${client.config.props[message.guild!.id].welcomer.message && client.config.props[message.guild!.id].welcomer.randomize ? '\nNote: A custom welcome message is already set. Both random and custom messages will be shown.' : ''}`);
        }
        else if (options.options.includes('--preview')) {
            const options = client.welcomer.generateEmbed(message.member!);

            if (!options) {
                await message.reply(`${emoji('error')} No welcome message set and randomization is disabled. Please configure one of those first!`);
                return;
            }

            await message.channel.send(options);
        }
        else {
            await message.reply(`${emoji('error')} Invalid argument(s) or option(s) supplied.`);
            return;
        }

        client.config.write();
    }
}
