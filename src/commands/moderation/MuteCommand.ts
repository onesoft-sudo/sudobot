import { BanOptions, CommandInteraction, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import History from '../../automod/History';
import getMember from '../../utils/getMember';
import ms from 'ms';
import { unmute } from './UnmuteCommand';
import PunishmentType from '../../types/PunishmentType';

export async function mute(client: DiscordClient, dateTime: number | undefined, user: GuildMember, msg: Message | CommandInteraction, timeInterval: number | undefined, reason: string | undefined) {
    try {
        const { default: Punishment } = await import('../../models/Punishment');
        
        const { getTimeouts, clearTimeoutv2, setTimeoutv2 } = await import('../../utils/setTimeout');

        const timeouts = getTimeouts();
        
        for (const timeout of timeouts.values()) {
            if (timeout.row.params) {
                try {
                    const json = JSON.parse(timeout.row.params);

                    if (json) {
                        if (json[1] === user.id) {
                            await clearTimeoutv2(timeout);
                        }
                    }
                }
                catch (e) {
                    console.log(e);                    
                }
            }
        }

        if (dateTime && timeInterval) {
            await client.db.get("INSERT INTO unmutes(user_id, guild_id, time) VALUES(?, ?, ?)", [user.id, msg.guild!.id, new Date(dateTime).toISOString()], async (err: any) => {
                if (err) 
                    console.log(err);
                
                    console.log('A timeout has been set.');

                    await setTimeoutv2('unmute-job', timeInterval, msg.guild!.id, `unmute ${user.id}`, msg.guild!.id, user.id);
            });
        }
        
        const role = await msg.guild!.roles.fetch(client.config.get('mute_role'));
        await user.roles.add(role!);

        await Punishment.create({
            type: PunishmentType.MUTE,
            user_id: user.id,
            guild_id: msg.guild!.id,
            mod_id: msg.member!.user.id,
            mod_tag: (msg.member!.user as User).tag,
            reason,
            meta: {
                time: timeInterval ? ms(timeInterval) : undefined
            }
        });

        await History.create(user.id, msg.guild!, 'mute', msg.member!.user.id, typeof reason === 'undefined' ? null : reason);
        await client.logger.logMute(user, reason === undefined || reason.trim() === '' ? "*No reason provided*" : reason, timeInterval, msg.member!.user as User);
        await user.send({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    iconURL: <string> msg.guild!.iconURL(),
                    name: `\tYou have been muted in ${msg.guild!.name}`
                })
                .addField("Reason", reason === undefined || reason.trim() === '' ? "*No reason provided*" : reason)
            ]
        });
    }
    catch (e) {
        console.log(e);
        
        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor('#f14a60')
                .setDescription("Failed to assign the muted role to this user. Maybe missing permisions/roles or I'm not allowed to assign roles this user?")
            ]
        });

        return;
    }
}

export default class MuteCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('mute', 'moderation', []);
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
        let time: string | undefined;
        let timeInterval: number | undefined;
        let dateTime: number | undefined;

        if (options.isInteraction) {
            user = await <GuildMember> options.options.getMember('member');

            if (options.options.getString('reason')) {
                reason = await <string> options.options.getString('reason');
            }

            if (options.options.getString('time')) {
                time = await options.options.getString('time') as string;
                timeInterval = await ms(time);

                if (!timeInterval) {
                    await msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(`Option \`-t\` (time) requires an argument which must be a valid time interval.`)
                        ]
                    });
        
                    return;
                }
            }
        }
        else {
            const user2 = await getMember((msg as Message), options);

            if (!user2) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });
    
                return;
            }

            user = user2;

            const index = await options.args.indexOf('-t');

            if (options.args[1]) {
                const args = [...options.args];
                args.shift();

                if (index !== -1) {
                    args.splice(index - 1, 2)
                }

                reason = await args.join(' ');
            }

            if (index !== -1) {
                time = await options.args[index + 1];

                if (time === undefined) {
                    await msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(`Option \`-t\` (time) requires an argument.`)
                        ]
                    });
        
                    return;
                }

                if (!ms(time)) {
                    await msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(`Option \`-t\` (time) requires an argument which must be a valid time interval.`)
                        ]
                    });
        
                    return;
                }

                timeInterval = await ms(time);
            }
        }

        if (timeInterval) {
            dateTime = Date.now() + timeInterval;
        }

        await mute(client, dateTime, user, msg, timeInterval, reason);

        const fields = [
            {
                name: "Muted by",
                value: (msg.member!.user as User).tag
            },
            {
                name: "Reason",
                value: reason === undefined || reason.trim() === '' ? "*No reason provided*" : reason
            },
            {
                name: "Duration",
                value: time === undefined ? "*No duration set*" : (time + '')
            }
        ];

        console.log(fields);        

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: user.user.tag,
                    iconURL: user.displayAvatarURL(),
                })
                .setDescription(user.user.tag + " has been muted.")
                .addFields(fields)
            ]
        });
    }
}