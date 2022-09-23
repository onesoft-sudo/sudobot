import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildBan } from 'discord.js';
import Punishment from '../../models/Punishment';
import PunishmentType from '../../types/PunishmentType';

export default class GuildBanAddEvent extends BaseEvent {
    constructor() {
        super('guildBanAdd');
    }
    
    async run(client: DiscordClient, ban: GuildBan) {
        await client.logger.logBanned(ban);

        const logs = (await ban.guild.fetchAuditLogs({
            limit: 1,
            type: 'MEMBER_BAN_ADD',
        })).entries.first();

        console.log(logs?.executor);

        await Punishment.create({
            type: PunishmentType.BAN,
            user_id: ban.user.id,
            guild_id: ban.guild!.id,
            mod_id: logs?.executor?.id ?? client.user!.id,
            mod_tag: logs?.executor?.tag ?? 'Unknown',
            reason: ban.reason ?? undefined
        });
    }
}