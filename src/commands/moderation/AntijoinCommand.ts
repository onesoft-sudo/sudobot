import { CommandInteraction, GuildMember, Interaction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class AntijoinCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('antijoin', 'moderation', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        client.antijoin.toggle();

        await message.reply({
            embeds: [
                new MessageEmbed({
                    description: 'Antijoin system was ' + (client.antijoin.enabled ? 'enabled' : 'disabled') + '.'
                })
            ]
        });
    }
}