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

export default class UnlockCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('unlock', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let channel: TextChannel = <TextChannel> msg.channel;
        let role: Role = <Role> msg.guild!.roles.everyone;
        const force = options.isInteraction ? options.options.getBoolean('force') === true : (options.options.indexOf('--force') !== -1);

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
            await client.db.get('SELECT * FROM locks WHERE channel_id = ?', [channel.id], async (err: any, data: any) => {
                if (data || force) {
                    let perm;
                    const data1 = data?.perms;

                    if (data1) {
                        if (data1 === 'DENY') {
                            await (perm = false);
                        }
                        else if (data1 === 'NULL') {
                            await (perm = null);
                        }
                        else if (data1 === 'ALLOW') {
                            await (perm = true);
                        }
                    }

                    console.log(data1, perm);                    
                    
                    if (force) {
                        await (perm = true);
                    }

                    await console.log(channel.name, role.name);

                    try {
                        await channel.permissionOverwrites.edit(role, {
                            SEND_MESSAGES: perm,
                        });
                    }
                    catch (e) {
                        console.log(e);
                    }

                    if (data) {
                        await client.db.get('DELETE FROM locks WHERE id = ?', [data?.id], async (err: any) => {});
                    }
                }
                else {
                    await msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#007bff')
                            .setDescription(`:closed_lock_with_key: This channel wasn't locked.`)
                        ],
                        ephemeral: true
                    });

                    return;
                }

                if (options.isInteraction) {
                    await msg.reply({
                        content: "Channel unlocked.",
                        ephemeral: true
                    });
                }
                else {
                    await (msg as Message).react('🔓');
                }

                await channel.send({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#007bff')
                        .setDescription(`:closed_lock_with_key: This channel has been unlocked.`)
                    ]
                });
            });
        }
        catch (e) {
            console.log(e);
            
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Failed to unlock channel. Maybe missing permissions?`)
                ],
                ephemeral: true
            });

            return;
        }
    }
}