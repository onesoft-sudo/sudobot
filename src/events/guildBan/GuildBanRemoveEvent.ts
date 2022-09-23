import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildBan } from 'discord.js';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';

export default class GuildBanRemoveEvent extends BaseEvent {
    constructor() {
        super('guildBanRemove');
    }
    
    async run(client: DiscordClient, ban: GuildBan) {
        await client.logger.logUnbanned(ban);

        const logs = (await ban.guild.fetchAuditLogs({
            limit: 1,
            type: 'MEMBER_BAN_REMOVE',
        })).entries.first();

        console.log(logs?.executor);

        await Punishment.create({
            type: PunishmentType.UNBAN,
            user_id: ban.user.id,
            guild_id: ban.guild!.id,
            mod_id: logs?.executor?.id ?? client.user!.id,
            mod_tag: logs?.executor?.tag ?? 'Unknown',
            reason: undefined
        });
    }
}