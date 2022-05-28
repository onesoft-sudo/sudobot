import { CommandInteraction, GuildMember, Interaction, Message, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import Help from '../../utils/help';
import ms from 'ms';
import { timeSince } from '../../utils/util';
import { setTimeoutv2 } from '../../utils/setTimeout';

export default class ExpireScheduleCommand extends BaseCommand {
    supportsInteractions = true;
    
    constructor() {
        super('expiresc', 'automation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[2] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least three arguments.`)
                ]
            });

            return;
        }

        const time1 = ms(options.isInteraction ? <string> await options.options.getString('send-after') : options.args[0]);
        const time2 = ms(options.isInteraction ? <string> await options.options.getString('delete-after') : options.args[1]);

        if (!time1) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid time interval given (send-after).`)
                ]
            });

            return;
        }   

        if (!time2) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid time interval given (delete-after).`)
                ]
            });

            return;
        }   

        let channel: TextChannel = <TextChannel> msg.channel;
        let text: string;
        
        if (options.isInteraction) {
            if (options.options.getChannel('channel')) {
                channel = <TextChannel> await options.options.getChannel('channel');
            }

            text = <string> await options.options.getString('content');
        }
        else if (msg instanceof Message) {
            const args = [...options.args];
            args.shift();
            args.shift();

            if (msg.mentions.channels.last()) {
                channel = await <TextChannel> msg.mentions.channels.last();
                args.pop();
            }
            
            text = args.join(' ');
        }

        if (!channel.send) {
            await msg.reply({
                content: 'Invalid text channel.',
                ephemeral: true
            });

            return;
        }

        try {
            const timeout = await setTimeoutv2('send-expire', time1, msg.guild!.id, `expiresc ${time1} ${time2} ${text!} #${channel.name}`, text!, channel.id, msg.guild!.id, time2);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setDescription('A queue job has been added.')
                    .setFooter({
                        text: 'ID: ' + timeout.row.id
                    })
                ],
                ephemeral: true
            });
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`I don't have enough permission to send messages on this channel.`)
                ]
            });

            return;
        }

        if (msg instanceof Message) {
            await msg.react('⏰');
        }
    }
}