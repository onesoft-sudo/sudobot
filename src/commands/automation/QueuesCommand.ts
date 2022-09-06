import { CommandInteraction, GuildMember, Interaction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { getTimeouts } from '../../utils/setTimeout';
import { timeProcess, timeSince } from '../../utils/util';

export default class QueuesCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('queues', 'automation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const map = await getTimeouts();
        let str = '';

        await map.forEach(value => {
            if (value.row.guild_id !== msg.guild!.id)
                return;
            
            console.log(new Date(value.row.time).getTime() - new Date().getTime());
            str += `**ID: ${value.row.id}**\n**User Command**: \`${value.row.cmd}\`\n**Internal Command**: \`${value.row.params}\`\n**ETA**: ${timeProcess((new Date(value.row.time).getTime() - new Date().getTime()) / 1000).replace(' ago', '')}\n**Queue Added**: ${value.row.createdAt.toLocaleString()} (${timeSince(value.row.createdAt.getTime())})\n\n`;
        });

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('Queue List')
                .setDescription(str === '' ? 'No queue.' : str)
                .setTimestamp()
            ]
        });
    }
}