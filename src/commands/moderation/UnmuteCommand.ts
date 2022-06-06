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

import PunishmentType from '../../types/PunishmentType';

export async function unmute(client: DiscordClient, user: GuildMember, d: User) {
    try {            
        await History.create(user.id, user.guild!, 'unmute', d.id, null);

        const role = await user.guild!.roles.fetch(client.config.get('mute_role'));
        await user.roles.remove(role!);

        const { default: Punishment } = await import('../../models/Punishment');

        const { getTimeouts, clearTimeoutv2 } = await import('../../utils/setTimeout');

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

        await Punishment.create({
            type: PunishmentType.UNMUTE,
            user_id: user.id,
            guild_id: user.guild!.id,
            mod_id: d.id,
            mod_tag: d.tag,
        });

        await user.send({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    iconURL: <string> user.guild!.iconURL(),
                    name: `\tYou have been unmuted in ${user.guild!.name}`
                })
            ]
        });

        await client.logger.logUnmute(user, d);
    }
    catch (e) {
        console.log(e);            
    }
}

export default class UnmuteCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('unmute', 'moderation', []);
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
        }

        await unmute(client, user, msg.member!.user as User);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: user.user.tag,
                    iconURL: user.user.displayAvatarURL(),
                })
                .setDescription(user.user.tag + " has been unmuted.")
                .addFields([
                    {
                        name: "Unmuted by",
                        value: (msg.member!.user as User).tag
                    },
                ])
            ]
        });
    }
}