import { CommandInteraction, GuildMember, Interaction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';
import { timeProcess } from '../../utils/util';

export default class SystemCommand extends BaseCommand {
    constructor() {
        super('system', 'settings', []);
        this.supportsInteractions = true;
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {    
        let msg: Message;

        if (message instanceof Message) {
            msg = await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('GOLD')
                    .setDescription('Loading data...')
                ]
            });
        }
        else {
            await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('GOLD')
                    .setDescription('Loading data...')
                ]
            });
            msg = <Message> await message.fetchReply();
        }

        const latency = msg.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        let latencyIcon = '🟢', apiLatencyIcon = '🟢';

        if (latency >= 500) {
            latencyIcon = '🔴';
        }
        else if (latency >= 350) {
            latencyIcon = '🟡';
        }

        if (apiLatency >= 400) {
            apiLatencyIcon = '🔴';
        }
        else if (apiLatency >= 300) {
            apiLatencyIcon = '🟡';
        }

        const memoryFree = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;

        const msgoptions: any = {
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    iconURL: client.user!.displayAvatarURL(),
                    name: 'System status'
                })
                .setDescription((latencyIcon !== '🔴' ? (await fetchEmoji('check'))?.toString() + ' All systems operational' : ':x: Some systems are down/slow'))
                .addFields([
                    {
                        name: 'Command Type',
                        value: `${msg instanceof Message ? 'Legacy (Message-based)' : 'Slash Command'}`
                    },
                    {
                        name: 'Uptime',
                        value: `${timeProcess(parseInt(process.uptime().toFixed(2)))}`
                    },
                    {
                        name: 'Latency',
                        value: `${latencyIcon} ${latency}ms`
                    },
                    {
                        name: 'API Latency',
                        value: `${apiLatencyIcon} ${apiLatency}ms`
                    },
                    {
                        name: 'Available Memory',
                        value: `${memoryFree}MB / 1.0GB`
                    },
                    {
                        name: 'System Platform',
                        value: `${process.platform}`
                    },
                    {
                        name: 'NodeJS Version',
                        value: `${process.version}`
                    }
                ])
            ]
        };

        if (msg instanceof CommandInteraction)
            msgoptions.content = '';

        await this.deferReply(msg, msgoptions, true);
    }
}