import { BanOptions, CommandInteraction, EmojiIdentifierResolvable, GuildMember, Interaction, Message, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import getMember from '../../utils/getMember';
import History from '../../automod/History';
import { fetchEmoji } from '../../utils/Emoji';

export default class HistoryCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('history', 'moderation', []);
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

        let user: User | null | undefined;

        if (options.isInteraction) {
            user = await <User> options.options.getUser('user');
        }
        else {
            try {
                user = await getUser(client, msg as Message, options);

                if (!user) 
                    throw new Error();
            }
            catch (e) {
                console.log(e);
                
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

        History.get(user.id, msg.guild!, async (data) => {
            let str = '';

            for await (const row of data) {
                let mod: User | string | undefined;

                try {
                    mod = await client.users.fetch(row.mod_id);

                    if (!mod) {
                        throw new Error();
                    }
                }
                catch (e) {
                    console.log(e);
                    
                    user = row.user_id;
                    mod = row.mod_id;
                }

                str += `\`[${new Date(row.date).toLocaleString()}]\` \`[${typeof mod === 'string' ? mod : mod?.tag}]\` `;

                let type: string;

                if (row.type === 'ban') {
                    type = 'Banned';
                }
                else if (row.type === 'unban') {
                    type = 'Unbanned';
                }
                else if (row.type === 'kick') {
                    type = 'Kicked';
                }
                else if (row.type === 'mute') {
                    type = 'Muted';
                }
                else if (row.type === 'unmute') {
                    type = 'Unmuted';
                }
                else if (row.type === 'bean') {
                    type = 'Beaned';
                }
                else if (row.type === 'warn') {
                    type = 'Warned';
                }
                else {
                    type = 'Deleted warning for';
                }

                str += `\`${type}\` \`${typeof user === 'string' ? user : user?.tag}\` \`[Reason: ${row.reason ? row.reason : "No reason provided"}]\`\n`;
            }

            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        name: user!.tag,
                        iconURL: user?.displayAvatarURL()!
                    })
                    .setTitle('Moderation history')
                    .setDescription(str == '' ? 'No history' : str)
                ]
            });
        });
    }
}