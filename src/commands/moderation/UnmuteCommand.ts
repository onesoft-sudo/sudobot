import { BanOptions, CommandInteraction, Guild, GuildMember, Interaction, Message, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import History from '../../automod/History';
import getMember from '../../utils/getMember';
import ms from 'ms';

export async function unmute(client: DiscordClient, user: GuildMember, msg: Message | CommandInteraction, d: User) {
    try {            
        await History.create(user.id, msg.guild!, 'unmute', msg.member!.user.id, null);

        const role = await msg.guild!.roles.fetch(client.config.get('mute_role'));
        await user.roles.remove(role!);

        await user.send({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    iconURL: <string> msg.guild!.iconURL(),
                    name: `\tYou have been unmuted in ${msg.guild!.name}`
                })
            ]
        });

        await client.logger.logUnmute(user, d);
    }
    catch (e) {
        console.log(e);            
    }
}

export default class UnmuteCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('unmute', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        let user: GuildMember;

        if (options.isInteraction) {
            user = await <GuildMember> options.options.getMember('member');

            if (!user) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription("Invalid user given.")
                    ]
                });
    
                return;
            }
        }
        else {
            try {
                const user2 = await getMember((msg as Message), options);

                if (!user2) {
                    throw new Error('Invalid user');
                }

                user = user2;
            }
            catch (e) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });
    
                return;
            }

            console.log(user);
        }

        await unmute(client, user, msg, msg.member!.user as User);

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: user.user.tag,
                    iconURL: user.user.displayAvatarURL(),
                })
                .setDescription(user.user.tag + " has been unmuted.")
                .addFields([
                    {
                        name: "Unmuted by",
                        value: (msg.member!.user as User).tag
                    },
                ])
            ]
        });
    }
}