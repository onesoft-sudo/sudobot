import { BanOptions, CommandInteraction, Message, Role, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class LockCommand extends BaseCommand {
    supportsInteractions: boolean = true;    

    constructor() {
        super('lock', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let channel: TextChannel = <TextChannel> msg.channel;
        let role: Role = <Role> msg.guild!.roles.everyone;

        if (msg instanceof CommandInteraction) 
            await msg.deferReply({ ephemeral: true });

        if (options.isInteraction) {
            if (options.options.getChannel('channel')) {
                channel = await <TextChannel> options.options.getChannel('channel');
            }

            if (options.options.getRole('role')) {
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
            const result = await client.channelLock.lock(channel, msg.member!.user as User, { sendConfirmation: true });

            let error = null;

            if (!result) {
                error = 'This channel is already locked' + (role.id === msg.guild!.id ? '' : ' for the given role') + '.';
            }

            if (error) {
                await this.deferReply(msg, {
                    content: error,
                });

                return;
            }
            
            if (options.isInteraction) {
                await this.deferReply(msg, {
                    content: "Channel locked.",
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