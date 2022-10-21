/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

import { CommandInteraction, Guild, GuildMember, Message, Permissions, User, UserFlags } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';
import { timeSince } from '../../utils/util';
import { roleMention } from '@discordjs/builders';

export const getUserBadges = (user: User) => {
    const { FLAGS } = UserFlags;
    
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

export function getPermissionLevel({ permissions, guild, id }: { id: string, permissions: GuildMember["permissions"], guild: Guild }, string: boolean = false) {
    if (guild.ownerId === id) {
        return string ? "100" : 100;
    }

    const allBits = Object.values(Permissions.FLAGS).length;
    const array = permissions.toArray();

    if (array.includes('ADMINISTRATOR')) {
        return string ? "100" : 100;
    }

    const percentage = (array.length / allBits) * 100;

    return string ? percentage.toString() : percentage;
}

export default class ProfileCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('profile', 'information', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let member: GuildMember | null = null;

        if (msg instanceof CommandInteraction && options.isInteraction) {
            if (options.options.getMember('user'))
                member = <GuildMember> await options.options.getMember('user');
            else
                member = <GuildMember> msg.member!;
        }
        else if (msg instanceof Message && !options.isInteraction) {
            if (options.normalArgs[0]) {
                try {
                    const tempMember = await getMember(msg, options);

                    if (!tempMember)
                        throw new Error();
                    
                    member = tempMember;
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
                member = msg.member!;
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

        const statusText = '' + ((member?.presence?.clientStatus?.desktop ? 'Desktop (' + status(member?.presence?.clientStatus?.desktop) + ')\n' : '') + (member?.presence?.clientStatus?.web ? 'Web (' + status(member?.presence?.clientStatus?.web) + ')\n' : '') + (member?.presence?.clientStatus?.mobile ? 'Mobile (' + status(member?.presence?.clientStatus?.mobile) + ')' : ''));
        // const state = user?.presence?.activities.find(a => a.type === 'CUSTOM')?.state;
        let activities: string[] | string = [];

        if (member?.presence) {
            for (const a of member?.presence?.activities.values()!) {
                console.log(a);
                
                if (a.type === 'CUSTOM') {
                    activities.push(`${a.emoji ? `${a.emoji.toString()} ` : ''}${a.state}`);
                }
                else if (a.type === 'LISTENING') {
                    if (a.name === 'Spotify') {
                        const url = a.syncId ? `https://open.spotify.com/track/${a.syncId}` : null;
                        activities.push(`:notes: Listening to **Spotify**: ${url ? '[' : '**'}${a.state?.replace(/\;/, ',')} - ${a.details}${url ? '](' + url + ')' : '**'}`);
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

        const allRoles = [...member!.roles.cache.values()].filter(role => role.id !== msg.guild!.id).sort((role1, role2) => {
            return role2.position - role1.position;
        });
        const limit = 10;
        const roles = (allRoles.length > limit ? allRoles.slice(0, limit) : allRoles).reduce((acc, value) => `${acc} ${roleMention(value.id)}`, '')!.trim()!;
        const fields = [
            {
                name: "Nickname",
                value: `${member!.nickname?.replace(/\*\<\>\@\_\~\|/g, '') ?? '*Nickname not set*'}`
            },
            {
                name: "Account Created",
                value: `${member!.user.createdAt.toLocaleDateString('en-US')} (${timeSince(member!.user.createdTimestamp)})`
            },
            {
                name: "Joined at",
                value: `${member!.joinedAt!.toLocaleDateString('en-US')} (${timeSince(member!.joinedTimestamp!)})`
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
                value: roles === '' ? '*No roles assigned*' : `${roles} ${allRoles.length > limit ? `**+ ${allRoles.length - limit} More**` : ''}`
            }
        ];

        const badges = getUserBadges(member!.user);

        if (badges.length > 0) {
            fields.push({
                name: 'Badges',
                value: badges.join("\n")
            });
        }

        let banner: string | undefined;

        try {
            await member?.user.fetch(true);
            banner = member!.user!.bannerURL({ size: 4096 }) ?? undefined;
        }
        catch (e) {
            console.log(e);
        }

        console.log("Banner", banner, member!.user!.banner);

        let percentage = <string> getPermissionLevel(member!, true);
        percentage = percentage.includes('.') ? percentage.substring(0, percentage.indexOf('.')) : percentage;

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    image: {
                        url: banner,
                    }
                })
                .setColor(member!.user!.hexAccentColor ? member!.user!.hexAccentColor! : '#007bff')
                .setAuthor({
                    name: member?.user.tag!,
                    iconURL: member!.user.displayAvatarURL()
                })
                .setThumbnail(member!.displayAvatarURL({
                    size: 4096
                }))
                .setFields(fields)
                .setFooter({
                    text: `${member?.user.bot ? 'Bot' : 'User'} • ${member!.id} • Has ${percentage.toString()}% permissions`
                })
            ]
        });
    }
}