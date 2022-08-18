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

        if (msg instanceof CommandInteraction) 
            await msg.deferReply({ ephemeral: true });

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
            const result = await client.channelLock.unlock(channel, { sendConfirmation: true, force });
            let error = null;

            if (!result) {
                error = 'This channel wasn\'t locked' + (role.id === msg.guild!.id ? '' : ' for the given role') + '. If you want to force unlock, run this command with `--force` option or select `True` if using slash commands.';
            }

            if (error) {
                await this.deferReply(msg, {
                    content: error,
                });

                return;
            }
            
            if (options.isInteraction) {
                await this.deferReply(msg, {
                    content: "Channel unlocked.",
                });
            }
            else {
                await (msg as Message).react('🔓');
            }
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