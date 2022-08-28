import { ColorResolvable, CommandInteraction, GuildMember, Message, User, UserFlags } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';
import { timeSince } from '../../utils/util';
import { roleMention } from '@discordjs/builders';

export default class ProfileCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('profile', 'information', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let user: GuildMember | null = null;

        if (msg instanceof CommandInteraction && options.isInteraction) {
            if (options.options.getMember('user'))
                user = <GuildMember> await options.options.getMember('user');
            else
                user = <GuildMember> msg.member!;
        }
        else if (msg instanceof Message && !options.isInteraction) {
            if (options.normalArgs[0]) {
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
            else {
                user = msg.member!;
            }
        }

        const status = (s: 'idle' | 'online' | 'dnd' | 'invisible' | null | undefined): string => {
            if (s === 'idle')
                return 'Idle';
            else if (s === 'dnd') 
                return 'Do not disturb';
            else if (s === 'online')
                return 'Online';
            else if (s === undefined || s === null || s === 'invisible') 
                return 'Offline/Invisible';

            return s;
        };    

        const statusText = '' + ((user?.presence?.clientStatus?.desktop ? 'Desktop (' + status(user?.presence?.clientStatus?.desktop) + ')\n' : '') + (user?.presence?.clientStatus?.web ? 'Web (' + status(user?.presence?.clientStatus?.web) + ')\n' : '') + (user?.presence?.clientStatus?.mobile ? 'Mobile (' + status(user?.presence?.clientStatus?.mobile) + ')' : ''));
        // const state = user?.presence?.activities.find(a => a.type === 'CUSTOM')?.state;
        let activities: string[] | string = [];

        if (user?.presence) {
            for (const a of user?.presence?.activities.values()!) {
                console.log(a);
                
                if (a.type === 'CUSTOM') {
                    activities.push(`${a.emoji?.toString() ?? ''}${a.emoji?.toString() ? ' ' : ''}${a.state}`);
                }
                else if (a.type === 'LISTENING') {
                    if (a.name === 'Spotify') {
                        activities.push(`:notes: Listening to **Spotify**: **${a.state?.replace(/\;/, ',')} - ${a.details}**`);
                        continue;
                    }

                    activities.push(`:musical_note: Listening to **${a.name}**`);
                }
                else if (a.type === 'COMPETING') {
                    activities.push(`:fire: Competing **${a.name}**`);
                }
                else if (a.type === 'PLAYING') {
                    activities.push(`:video_game: Playing **${a.name}**`);
                }
                else if (a.type === 'STREAMING') {
                    activities.push(`:video_camera: Streaming **${a.name}**`);
                }
                else if (a.type === 'WATCHING') {
                    activities.push(`:tv: Watching **${a.name}**`);
                }
            }
        }

        activities = activities.join('\n');

        const { FLAGS } = UserFlags;

        const getUserBadges = (user: User) => {
            const badges = [];

            if (user.flags?.has(FLAGS.BUGHUNTER_LEVEL_1)) 
                badges.push('Bughunter Level 1');
            if (user.flags?.has(FLAGS.BUGHUNTER_LEVEL_2)) 
                badges.push('Bughunter Level 2');
            if (user.flags?.has(FLAGS.DISCORD_CERTIFIED_MODERATOR)) 
                badges.push('Discord Certified Moderator');
            if (user.flags?.has(FLAGS.DISCORD_EMPLOYEE)) 
                badges.push('Discord Staff');
            if (user.flags?.has(FLAGS.EARLY_SUPPORTER)) 
                badges.push('Early Nitro Supporter');
            if (user.flags?.has(FLAGS.EARLY_VERIFIED_BOT_DEVELOPER)) 
                badges.push('Early Verified Bot Developer');
            if (user.flags?.has(FLAGS.HOUSE_BALANCE)) 
                badges.push('HypeSquad Balance');
            if (user.flags?.has(FLAGS.HOUSE_BRILLIANCE)) 
                badges.push('HypeSquad Brilliance');
            if (user.flags?.has(FLAGS.HOUSE_BRAVERY)) 
                badges.push('HypeSquad Bravery');
            if (user.flags?.has(FLAGS.HYPESQUAD_EVENTS)) 
                badges.push('HypeSquad Events');
            if (user.flags?.has(FLAGS.PARTNERED_SERVER_OWNER)) 
                badges.push('Partnered Server Owner');
            if (user.flags?.has(FLAGS.BOT_HTTP_INTERACTIONS)) 
                badges.push('Supports Interactions');
            if (user.flags?.has(FLAGS.VERIFIED_BOT)) 
                badges.push('Verified Bot');
            
            return badges.map(b => `🔵 ${b}`);
        };

        const fields = [
            {
                name: "Nickname",
                value: `${user!.nickname?.replace(/\*\<\>\@\_\~\|/g, '') ?? '*Nickname not set*'}`
            },
            {
                name: "Account Created",
                value: `${user!.user.createdAt.toLocaleDateString('en-US')} (${timeSince(user!.user.createdTimestamp)})`
            },
            {
                name: "Joined at",
                value: `${user!.joinedAt!.toLocaleDateString('en-US')} (${timeSince(user!.joinedTimestamp!)})`
            },
            {
                name: 'Active Devices',
                value: `${statusText === '' ? 'Offline/Invisible' : statusText}`
            },
            {
                name: 'Status',
                value: `${activities?.trim() === '' ? '*No status set*' : activities}`
            },
            {
                name: 'Roles',
                value: user?.roles.cache.filter(role => role.id !== msg.guild!.id).sort((role1, role2) => {
                    return role2.position - role1.position;
                }).reduce((acc, value) => `${acc} ${roleMention(value.id)}`, '')!.trim()!
            }
        ];

        const badges = getUserBadges(user!.user);

        if (badges.length > 0) {
            fields.push({
                name: 'Badges',
                value: badges.join("\n")
            });
        }

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setColor(user!.user!.hexAccentColor ? user!.user!.hexAccentColor! : '#007bff')
                .setAuthor({
                    name: user?.user.tag!,
                    iconURL: user!.user.displayAvatarURL()
                })
                .setThumbnail(user!.displayAvatarURL({
                    size: 4096
                }))
                .setFields(fields)
                .setFooter({
                    text: `${user!.id} - ${user?.user.bot ? 'Bot' : 'User'}`
                })
            ]
        });
    }
}