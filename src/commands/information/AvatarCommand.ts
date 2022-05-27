import { ColorResolvable, CommandInteraction, GuildMember, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import e from 'express';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';

export default class AvatarCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('avatar', 'information', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let fetchUser: boolean = options.isInteraction ? <boolean> options.options.getBoolean('guild-specific') : (options.options.includes('-g') || options.options.includes('--guild'));
        
        fetchUser ??= false;

        let user: GuildMember | User | null = null;

        if (msg instanceof CommandInteraction && options.isInteraction) {
            if (fetchUser) {
                if (options.options.getUser('user'))
                    user = <User> await options.options.getUser('user');
                else
                    user = <User> msg.member!.user;
            } 
            else {
                if (options.options.getMember('user'))
                    user = <GuildMember> await options.options.getMember('user');
                else
                    user = <GuildMember> msg.member!;
            }
        }
        else if (msg instanceof Message && !options.isInteraction) {
            if (options.normalArgs[0]) {
                if (fetchUser) {
                    try {
                        const tempUser = await getUser(client, msg, options);

                        if (!tempUser)
                            throw new Error();
                        
                        user = tempUser;
                    }
                    catch (e) {
                        console.log(e);              
                        
                        await msg.reply({
                            embeds: [
                                new MessageEmbed()
                                .setColor('#f14a60')
                                .setDescription(':x: The user doesn\'t exist.')
                            ]
                        });

                        return;
                    }
                }
                else {
                    try {
                        const tempMember = await getMember(msg, options);

                        if (!tempMember)
                            throw new Error();
                        
                        user = tempMember;
                    }
                    catch (e) {
                        console.log(e);              
                        
                        await msg.reply({
                            embeds: [
                                new MessageEmbed()
                                .setColor('#f14a60')
                                .setDescription(':x: The user doesn\'t exist or not a member of this server.')
                            ]
                        });

                        return;
                    }
                }
            }
            else {
                user = fetchUser ? msg.author : msg.member!;
            }
        }

        const mainUser = user instanceof GuildMember ? user.user : user;

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor(mainUser!.hexAccentColor ? mainUser!.hexAccentColor! : '#007bff')
                .setAuthor({
                    name: user instanceof User ? mainUser!.tag : (user?.nickname !== null ? user?.nickname : user.user.tag)!
                })
                .setImage(mainUser!.displayAvatarURL({
                    size: 4096
                }))
                .setURL(mainUser!.displayAvatarURL({
                    size: 4096
                }))
                .addField('Download', `[Click Here](${mainUser!.displayAvatarURL({ size: 4096 })})`)
                .setFooter({
                    text: `${mainUser!.tag} (${mainUser!.id})`
                })
            ]
        });
    }
}