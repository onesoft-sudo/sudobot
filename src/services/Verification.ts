import { GuildMember } from "discord.js";
import { Request } from "express";
import { Op } from "sequelize";
import DiscordClient from "../client/Client";
import MessageEmbed from "../client/MessageEmbed";

export default class Verification {
    constructor(protected client: DiscordClient) {

    }

    async success(member: GuildMember, req: Request) {        
        await member.roles.remove(this.client.config.props[member.guild.id].verification.role);

        await member.send({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: member.guild.name,
                        iconURL: member.guild.iconURL() ?? undefined,
                    },
                    title: "Thanks for verifying!",
                    description: "The verification was completed successfully!",
                    timestamp: new Date()
                })
            ],
        });

        const { default: UnverifiedMember } = await import('../models/UnverifiedMember');

        const data = await UnverifiedMember.findOne({
            where: {
                guild_id: member.guild.id,
                user_id: member.id,
                status: 'pending'
            }
        });

        await data?.set('status', 'done');
        await data?.set('ip', req.ip);
        await data?.set('user_agent', req.get('User-Agent'));
        await data?.save();
    }

    async start(member: GuildMember) {
        const { default: UnverifiedMember } = await import('../models/UnverifiedMember');

        await UnverifiedMember.create({
            guild_id: member.guild.id,
            user_id: member.id,
            status: 'pending'
        });

        await member.roles.add(this.client.config.props[member.guild.id].verification.role);

        const url = `${this.client.config.props.global.cp_host}/challenge/v1/verify/?guild_id=${member.guild.id}`;

        await member.send({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: member.guild.name,
                        iconURL: member.guild.iconURL() ?? undefined,
                    },
                    title: "Verification Required!",
                    description: `Hey ${member.nickname ?? member.user.username}, the server **${member.guild.name}** requires verification!\nTo verify yourself, simply go to the verification URL given below and you might be asked to solve some captcha.\n\nHave a nice day,\n*${member.guild.name} Staff*`,
                    timestamp: new Date(),
                    fields: [
                        {
                            name: "Verification URL",
                            value: url
                        }
                    ],
                    url
                })
            ]
        });
    }
}