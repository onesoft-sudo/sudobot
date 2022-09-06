import { BanOptions, CommandInteraction, EmojiIdentifierResolvable, GuildMember, Interaction, Message, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';

export default class VerifyCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('verify', 'moderation', []);
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

        let member: GuildMember | null | undefined;

        if (options.isInteraction) {
            member = <GuildMember> await options.options.getMember('user');

            if (!member) {
                await msg.reply({
                    content: 'Invalid member given.'
                });

                return;
            }
        }
        else {
            try {
                member = await getMember(msg as Message, options);

                if (!member)    
                    throw new Error();
            }
            catch (e) {
                console.log(e);
                
                await msg.reply({
                    content: 'Invalid member given.'
                });

                return;
            }
        }

        if (member.roles.cache.has(client.config.props[member.guild.id].mod_role)) {
            await msg.reply(`Cannot enforce verification to a moderator.`);
            return;
        }

        // if (member.roles.cache.has(client.config.props[member.guild.id].verification.role)) {
        //     await msg.reply(`Verification is already enforced to this user.`);
        //     return;
        // }

        await client.verification.start(member);

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: member.user.tag,
                        iconURL: member.displayAvatarURL()
                    },
                    description: `Verfication has been enforced to this user. They won't be able to access channels or talk unless they verify themselves.`
                })
            ]
        });
    }
}