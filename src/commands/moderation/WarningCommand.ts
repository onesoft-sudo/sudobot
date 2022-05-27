import { BanOptions, CommandInteraction, Guild, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import History from '../../automod/History';
import getMember from '../../utils/getMember';
import ms from 'ms';

export default class WarningCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('warning', 'moderation', []);
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

        let id: string;

        if (options.isInteraction) {
            id = await options.options.getNumber('id')?.toString()!;
        }
        else {
            id = options.args[0];
        }

        await client.db.get('SELECT * FROM warnings WHERE id = ?', [id], async (err: any, data: any) => {
            if (err) {
                console.log(err);
            }

            if (!data) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`No warning found.`)
                    ]
                });
    
                return;
            }

            let user = data.user_id;

            console.log('here1');

            try {
                user = await msg.guild!.members.fetch(data.user_id);
            }
            catch(e) {
                console.log(e);
            }


            console.log('user2');

            let by = data.warned_by;

            console.log(data);

            try {
                by = await msg.guild!.members.fetch(data.warned_by);
            }
            catch(e) {
                console.log(e);
            }

            console.log('here');
            let embed = await new MessageEmbed()
                        .setDescription(data.reason === '\c\b\c' ? "*No reason provided*" : data.reason)
                        .addField('ID', data.id + '')
                        .addField('Warned by', typeof by === 'string' ? by : by.user.tag);
            
            if (typeof user === 'string') {
                embed.setAuthor({
                    name: `${user}`
                });
            }
            else {
                embed.setAuthor({
                    iconURL: user.displayAvatarURL(),
                    name: `${user.user.tag}`
                })
            }


            await msg.reply({
                embeds: [
                    embed
                ]
            });
        });        
    }
}