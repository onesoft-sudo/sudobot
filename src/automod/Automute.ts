import { GuildMember } from "discord.js";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";
import Service from "../utils/structures/Service";

export default class Automute extends Service {
    MuteRecord: any;

    constructor(client: DiscordClient) {
        super(client);
        this.MuteRecord = require("../models/MuteRecord").default;
    }

    public async mute(member: GuildMember) {
        await member.roles.add(this.client.config.props[member.guild.id].mute_role);
    }

    public async onMemberJoin(member: GuildMember) {
        const { MuteRecord } = this;
        const muteRecord = await MuteRecord.findOne({
            where: {
                user_id: member.user.id,
                guild_id: member.guild.id
            }
        });

        if (!muteRecord) {
            return;
        }

        await this.mute(member);

        this.client.logger.send(member.guild, {
            embeds: [
                new MessageEmbed({
                    author: {
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL(),
                    },
                    description: 'This user had left the server when they were muted. They\'ve been muted again.',
                    color: 'GOLD',
                    footer: { text: 'Auto Mute' }
                })
                .setTimestamp()
            ]
        });

        await muteRecord.destroy();
    }

    public async onMemberLeave(member: GuildMember) {
        const { MuteRecord } = this;

        if (!member.roles.cache.has(this.client.config.props[member.guild.id].mute_role)) {
            return;
        }

        const muteRecord = await MuteRecord.findOne({
            where: {
                user_id: member.user.id,
                guild_id: member.guild.id
            }
        });

        if (!muteRecord) {
            await MuteRecord.create({
                user_id: member.user.id,
                guild_id: member.guild.id 
            });
        }
    }
}