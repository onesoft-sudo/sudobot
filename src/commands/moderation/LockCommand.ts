import { BanOptions, CommandInteraction, EmojiIdentifierResolvable, GuildMember, Interaction, Message, Permissions, Role, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';
import { fetchEmoji } from '../../utils/Emoji';

export default class LockCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('lock', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let channel: TextChannel = <TextChannel> msg.channel;
        let role: Role = <Role> msg.guild!.roles.everyone;

        if (options.isInteraction) {
            if (options.options.getChannel('channel')) {
                channel = await <TextChannel> options.options.getChannel('channel');
            }

            if (options.options.getChannel('role')) {
                role = await <Role> options.options.getRole('role');
            }
        }
        else {
            if ((msg as Message).mentions.roles.first()) {
                role = await <Role> (msg as Message).mentions.roles.first();
            }
            else if (options.normalArgs[0] && options.normalArgs[0] !== 'everyone') {
                role = <Role> await (msg as Message).guild?.roles.fetch(options.normalArgs[0]);
            }

            if ((msg as Message).mentions.channels.first()) {
                channel = await <TextChannel> (msg as Message).mentions.channels.first();
            }
            else if (options.normalArgs[1]) {
                channel = <TextChannel> await (msg as Message).guild?.channels.fetch(options.normalArgs[1]);
            }

            if (!role) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid role given.`)
                    ],
                    ephemeral: true
                });
    
                return;
            }

            if (!channel || channel.type !== 'GUILD_TEXT') {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid text channel given.`)
                    ],
                    ephemeral: true
                });
    
                return;
            }
        }

        try {
            let dbPerms;
            let dbPerms1;

            let overWrites = await channel.permissionOverwrites.cache.get(role.id);
            let allowperms = await overWrites?.allow?.has(Permissions.FLAGS.SEND_MESSAGES);
            let denyperms = await overWrites?.deny?.has(Permissions.FLAGS.SEND_MESSAGES);

            let role1 = await channel.guild.roles.fetch(client.config.props[channel.guild.id].gen_role);

            let overWrites1 = await channel.permissionOverwrites.cache.get(role1!.id);
            let allowperms1 = await overWrites1?.allow?.has(Permissions.FLAGS.SEND_MESSAGES);
            let denyperms1 = await overWrites1?.deny?.has(Permissions.FLAGS.SEND_MESSAGES);

            if (allowperms && !denyperms) {
                await (dbPerms = 'ALLOW');
            }
            else if (!allowperms && denyperms) {
                await (dbPerms = 'DENY');
            }
            else if (!allowperms && !denyperms) {
                await (dbPerms = 'NULL');
            }

            if (allowperms1 && !denyperms1) {
                await (dbPerms1 = 'ALLOW');
            }
            else if (!allowperms1 && denyperms1) {
                await (dbPerms1 = 'DENY');
            }
            else if (!allowperms1 && !denyperms1) {
                await (dbPerms1 = 'NULL');
            }
            
            await client.db.get('INSERT INTO locks(channel_id, perms, date) VALUES(?, ?, ?)', [channel.id, dbPerms + ',' + dbPerms1, new Date().toISOString()], async (err: any) => {
                if (err)
                    console.log(err);
                
                try {
                    await channel.permissionOverwrites.edit(role, {
                        SEND_MESSAGES: false,
                    });
                }
                catch (e) {
                    console.log(e);
                }

                try {
                    await channel.permissionOverwrites.edit(role1!, {
                        SEND_MESSAGES: false,
                    });
                }
                catch (e) {
                    console.log(e);
                }
            })
  
            await channel.send({
                embeds: [
                    new MessageEmbed()
                    .setColor('#007bff')
                    .setDescription(`:lock: This channel has been locked.`)
                ]
            });
            
            if (options.isInteraction) {
                await msg.reply({
                    content: "Channel locked.",
                    ephemeral: true
                });
            }
            else {
                await (msg as Message).react('🔒');
            }
        }
        catch (e) {
            console.log(e);
            
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Failed to lock channel. Maybe missing permissions?`)
                ],
                ephemeral: true
            });

            return;
        }
    }
}