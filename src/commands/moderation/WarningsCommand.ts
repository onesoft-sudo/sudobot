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

export default class WarningsCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('warnings', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let user: GuildMember | null | undefined;

        if (options.isInteraction) {
            if (options.options.getMember('member'))
                user = await <GuildMember> options.options.getMember('member');
        }
        else {
            if (options.args[0]) {
                try {
                    user = await getMember(msg as Message, options);
    
                    if (!user) {
                        throw new Error();
                    }
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
            }
        }

        var test = false;

        if (!user) {
            var args1: [string, string[]] = ['SELECT * FROM warnings WHERE guild_id = ?', [msg.guild!.id]];
            var a: any = {
                name: `All warnings`
            };
        }
        else {
            var args1: [string, string[]] = ['SELECT id, user_id, guild_id, reason FROM warnings WHERE user_id = ? AND guild_id = ?', [user.id, msg.guild!.id]];
            var a: any = {
                iconURL: user.displayAvatarURL(),
                name: `All warnings for ${user.user.tag} in ${msg.guild!.name}`
            };

            test = true;
        }

        await client.db.all(...args1, async (err: any, data: any) => {
            if (err) {
                console.log(err);
            }

            let i = 0;

            let warnings = await data.map((value: any) => {
                i++;
                return {
                    name: "Warning " + i + " (ID: " + value.id + (!test ? ", To: " + value.user_id : "") + ")",
                    value: value.reason === '\c\b\c' ? "No reason provided" : value.reason
                };
            });

            if (test) {
                warnings.push(
                    {
                        name: "Strike",
                        value: i + ' time(s)'
                    }
                );
            }

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor(a)
                    .addFields(warnings)
                ]
            });
        });
    }
}