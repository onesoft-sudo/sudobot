import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import axios from 'axios';
import path from 'path';
import { deleteFile, download } from '../../utils/util';
import MessageEmbed from '../../client/MessageEmbed';

export default class StatsCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('stats', 'information', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let members = 0;
        let bots = 0;
        
        msg.guild!.members.cache.forEach(m => {
            if (m.user.bot)
                bots++;
            else 
                members++;
        });
        
        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: msg.guild!.name,
                    iconURL: msg.guild!.iconURL()!,
                })
                .addFields([
                    {
                        name: "Members",
                        inline: true,
                        value: members + ''
                    },
                    {
                        name: "Bots",
                        inline: true,
                        value: bots + ''
                    },
                    {
                        name: "Total Members",
                        inline: true,
                        value: (members + bots) + ''
                    }
                ])
                .addField('Roles', msg.guild!.roles.cache.size + '')
                .addField('Text Channels', msg.guild!.channels.cache.filter(c => c.type === 'GUILD_TEXT').size + '')
                .addField('Emojis', msg.guild!.emojis.cache.size + '')
                .addField('Stickers', msg.guild!.stickers?.cache.size + '')
            ]
        });
    }
}