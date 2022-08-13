import { CommandInteraction, GuildMember, Interaction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import dot from 'dot-object';
import { fetchEmoji } from '../../utils/Emoji';

export default class ConfigCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('config', 'settings', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        const keyMap = options.isInteraction ? options.options.getString('key') : options.args[0];
        const value = options.isInteraction ? options.options.getString('value') : options.args[1];

        if (keyMap && !value) {
            const val = dot.pick(keyMap, client.config.props[message.guild!.id]);

            await message.reply({
                content: val === undefined ? `${await fetchEmoji('error')} The given configuration key does not exist.` : (typeof val === 'object' ? "```json" + JSON.stringify(val, null, 2) + "```" : (val + ''))
            });
        }
        else if (keyMap && value) {
            if (dot.pick(keyMap, client.config.props[message.guild!.id]) === undefined) {
                await message.reply({ content: `${await fetchEmoji('error')} The given configuration key does not exist.` });
                return;
            }

            dot.set(keyMap, value, client.config.props[message.guild!.id]);
            await message.reply({ content: `${await fetchEmoji('check')} Configuration updated.` });
        }
    }
}