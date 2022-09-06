import { CommandInteraction, GuildEmoji, Message, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';

export default class AnnounceCommand extends BaseCommand {
    supportsInteractions = true;

    constructor() {
        super('announce', 'utils', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        let content: string;

        if (options.isInteraction) {
            content = <string> await options.options.getString('content');
        }
        else {
            content = await options.args.join(' ');
        }

        try {
            const channel = await <TextChannel> msg.guild!.channels.cache.find(c => c.id === client.config.get('announcement_channel'));

            if (!channel) {
                await msg.reply({
                    content: ":x: Channel not found"
                });

                return;
            }

            await channel.send({
                content
            });

            if (msg instanceof Message) 
                await msg.react(<GuildEmoji> (await fetchEmoji('check')));
            else
                await msg.reply({
                    content: (<GuildEmoji> (await fetchEmoji('check'))).toString() + " The message has been announced!",
                    ephemeral: true
                });
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                content: ":x: Failed to send message",
                ephemeral: true
            });
        }
    }
}