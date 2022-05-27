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

export default class WarndelCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('warndel', 'moderation', []);
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
            id = await <string> options.options.getNumber('id')?.toString();
        }
        else {
            id = await options.args[0];
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

            await client.db.get("DELETE FROM warnings WHERE id = ?", [id], async (err: any) => {
                if (err) {
                    console.log(err);
                }

                let user = {
                    user: {
                        tag: data.user_id
                    }
                };

                await History.create(data.user_id, msg.guild!, 'warndel', msg.member!.user.id, null, async (data2) => {});

                try {
                    user = await msg.guild!.members.fetch(data.user_id);
                }
                catch(e) {
                    
                }

                await client.logger.logWarndel(msg as Message, user as GuildMember, data, msg.member!.user as User);

                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setDescription('Warning deleted successfully.')
                    ]
                });
            });
        });
    }
}