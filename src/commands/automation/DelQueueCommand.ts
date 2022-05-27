import { CommandInteraction, GuildMember, Interaction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import Help from '../../utils/help';
import { clearTimeoutv2, getTimeout, getTimeouts } from '../../utils/setTimeout';

export default class DelQueueCommand extends BaseCommand {
    constructor() {
        super('delqueue', 'automation', []);
    }

    async run(client: DiscordClient, msg: Message, options: CommandOptions) {
        if (options.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        const timeout = await getTimeout(parseInt(options.args[0]));
        console.log(getTimeouts());

        if (!timeout || timeout.row.guild_id !== msg.guild!.id) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid queue ID given.`)
                ]
            });

            return;
        }

        await clearTimeoutv2(timeout);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setDescription(`The queue has been deleted.`)
                .addField('Command', `\`${timeout.row.cmd}\``)
                .setFooter({
                    text: 'ID: ' + timeout.row.id
                })
            ]
        });
    }
}