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

export async function warn(client: DiscordClient, user: User, reason: string | undefined, msg: Message | CommandInteraction, callback: Function, warned_by1?: User) {
    await client.db.get('INSERT INTO warnings(user_id, guild_id, strike, reason, warned_by) VALUES(?, ?, 1, ?, ?)', [user.id, msg.guild!.id, reason === undefined ? '\c\b\c' : reason, warned_by1 === undefined ? msg.member!.user.id : warned_by1.id], async (err: any) => {
        if (err) {
            console.log(err);
        }

        await client.db.get('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY id DESC LIMIT 0, 1', [user.id, msg.guild!.id], async (err: any, data: any) => {
            if (err) {
                console.log(err);
            }

            await client.db.get('SELECT id, COUNT(*) as count, guild_id, user_id FROM warnings WHERE user_id = ? AND guild_id = ?', [user.id, msg.guild!.id], async (err: any, data3: any) => {
                await client.logger.logWarn(msg as Message, user, warned_by1 === undefined ? msg.member!.user as User : warned_by1, typeof reason === 'undefined' ? '*No reason provided*' : reason, data.id);
            
                await History.create(user.id, msg.guild!, 'warn', warned_by1 === undefined ? msg.member!.user.id : warned_by1.id, typeof reason === 'undefined' ? null : reason, async () => {
                    await user.send({
                        embeds: [
                            new MessageEmbed()
                            .setAuthor({
                                iconURL: msg.guild!.iconURL() as string,
                                name: `\tYou have been warned in ${msg.guild!.name}`
                            })
                            .addFields([
                                {
                                    name: "Reason",
                                    value: typeof reason === 'undefined' ? '*No reason provided*' : reason
                                },
                                {
                                    name: "Strike",
                                    value: data3.count + ' time(s)'
                                }
                            ])
                        ]
                    });

                    console.log(data3);                    

                    callback({count: data3.count, ...data});
                });
            });
        });
    });
}

export default class WarnCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('warn', 'moderation', []);
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

        let user: GuildMember;
        let reason: string | undefined;

        if (options.isInteraction) {
            user = await <GuildMember> options.options.getMember('member');

            if (!user) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription("Invalid user given.")
                    ]
                });
    
                return;
            }

            if (options.options.getString('reason')) {
                reason = <string> options.options.getString('reason');
            }
        }
        else {
            try {
                const user2 = await getMember((msg as Message), options);

                if (!user2) {
                    throw new Error('Invalid user');
                }

                user = user2;
            }
            catch (e) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });
    
                return;
            }

            console.log(user);

            if (options.args[1]) {
                await options.args.shift();
                reason = options.args.join(' ');
            }
        }

        try {
            await warn(client, user.user, reason, msg, async (data: any) => {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setDescription(`The user ${user.user.tag} has been warned`)
                        .addFields([
                            {
                                name: "Reason",
                                value: typeof reason === 'undefined' ? '*No reason provided*' : reason
                            },
                            {
                                name: "Strike",
                                value: data.count + ' time(s)'
                            },
                            {
                                name: "Warned by",
                                value: (msg.member?.user as User).tag
                            },
                            {
                                name: "ID",
                                value: data.id + ''
                            }
                        ])
                    ]
                });
            }, msg.member?.user as User);
        }
        catch (e) {
            console.log(e);            
        }
    }
}