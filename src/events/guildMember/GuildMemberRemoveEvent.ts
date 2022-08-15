import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildMember } from 'discord.js';
import UnverifiedMember from '../../models/UnverifiedMember';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';
import MessageEmbed from '../../client/MessageEmbed';

export default class GuildMemberRemoveEvent extends BaseEvent {
    constructor() {
        super('guildMemberRemove');
    }
    
    async run(client: DiscordClient, member: GuildMember) {
        if (member.user.id === client.user!.id)
            return;

        await client.logger.logLeft(member);

        if (member.user.bot)
            return;

        const logs = (await member.guild.fetchAuditLogs({
            limit: 1,
            type: 'MEMBER_KICK',
        })).entries.first();

        if (logs && logs.target?.id === member.id && logs.createdAt >= (member.joinedAt ?? 0)) {
            console.log(logs?.executor);

            await Punishment.create({
                type: PunishmentType.KICK,
                user_id: member.user.id,
                guild_id: member.guild!.id,
                mod_id: logs?.executor?.id ?? client.user!.id,
                mod_tag: logs?.executor?.tag ?? 'Unknown',
                reason: logs.reason ?? undefined
            });

            client.logger.log(member.guild, async channel => {
                await channel.send({
                    embeds: [
                        new MessageEmbed({
                            author: {
                                name: member.user.tag,
                                iconURL: member.user.displayAvatarURL(),
                            },
                            title: 'Member Kicked',
                            description: 'This user has left the server, probably due to a kick.',
                            fields: [
                                {
                                    name: 'Kicked by',
                                    value: logs?.executor?.tag ?? 'Unknown'
                                },
                                {
                                    name: 'Reason',
                                    value: logs?.reason ?? '*No reason provided*'
                                }
                            ],
                            footer: {
                                text: 'Kicked'
                            }
                        })
                        .setTimestamp()
                    ]
                });
            });
        }
        
        await client.autoClear.start(member, member.guild);

        const verificationData = await UnverifiedMember.findOne({
            where: {
                guild_id: member.guild.id,
                user_id: member.id,
                status: 'pending'
            }
        });

        if (verificationData) {
            await verificationData.set('status', 'canceled');
            await verificationData.save();
        }
        
        await client.automute.onMemberLeave(member);
    }
}