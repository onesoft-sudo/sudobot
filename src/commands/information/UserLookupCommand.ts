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

import { formatDistanceStrict, formatDistanceToNowStrict } from "date-fns";
import { APIEmbedField } from "discord-api-types/v9";
import { Util, Message, CacheType, CommandInteraction } from "discord.js";
import Client from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import Punishment from "../../models/Punishment";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import PunishmentType from "../../types/PunishmentType";
import { emoji } from "../../utils/Emoji";
import getUser from "../../utils/getUser";
import BaseCommand from "../../utils/structures/BaseCommand";
import { getUserBadges } from "./ProfileCommand";

export default class UserLookupCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super("userlookup", "information", ['user', 'ulookup', 'userinfo']);
    }

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply({ ephemeral: true, content: `${emoji("error")} You must specify a user to lookup!` });
            return;
        }

        const user = !options.isInteraction ? await getUser(client, message as Message, options, 0) : options.options.getUser("user");

        if (!user) {
            await message.reply({ content: `${emoji("error")} That user does not exist.` });
            return;
        }

        let member = undefined;

        try {
            member = await message.guild!.members.fetch(user.id);

            if (!member)
                throw new Error("Member not found");
        }
        catch (e) {
            console.log(e);       
            member = undefined;     
        }
        
        const embed = new MessageEmbed({
            author: {
                name: user.tag,
                iconURL: user.displayAvatarURL()
            },
            footer: {
                text: `${user.id}`,
            }
        });

        const fieldsCommon: APIEmbedField[] = [  
            
        ];

        let fields: APIEmbedField[] = [
            {
                name: "Server Member?",
                value: member ? "Yes" : "No",
                inline: true
            },
            {
                name: "Bot?",
                value: user.bot ? "Yes" : "No",
                inline: true
            },
            {
                name: "Account created",
                value: user.createdAt.toLocaleString() + " (" + formatDistanceToNowStrict(user.createdAt, { addSuffix: true }) + ")",
                inline: true
            }
        ];

        embed.setThumbnail(user.displayAvatarURL());

        if (member) {
            fields.push({
                name: "Joined Server",
                value: member.joinedAt ? member.joinedAt.toLocaleString() + " (" + formatDistanceToNowStrict(member.joinedAt, { addSuffix: true }) + ")" : "Information not available",
                inline: true
            });

            if (member.premiumSince) {
                fields.push({
                    name: "Boosted Server",
                    value: member.premiumSince.toLocaleString() + " (" + formatDistanceToNowStrict(member.premiumSince, { addSuffix: true }) + ")",
                    inline: true
                });
            }

            if (member.communicationDisabledUntil) {
                fields.push({
                    name: "Timed-out Until",
                    value: member.communicationDisabledUntil.toLocaleString() + " (" + formatDistanceStrict(member.communicationDisabledUntil, new Date()) + ")",
                    inline: true
                });
            }

            if (member.displayAvatarURL()) {
                embed.setThumbnail(member.displayAvatarURL());
            }

            if (member.nickname) {
                fields.push({
                    name: "Nickname",
                    value: Util.escapeMarkdown(member.nickname)
                });
            }

            if (member.displayHexColor) {
                fields.push({
                    name: "Guild Profile Theme Color",
                    value: member.displayHexColor
                });
            }

            if (member.voice && member.voice.channel) {
                fields.push({
                    name: "Current Voice Channel",
                    value: member.voice.channel.toString()
                });
            }

            fields.push({
                name: "Completed Membership Screening",
                value: member.pending ? "No" : "Yes"
            });

            fields.push({
                name: "Mention",
                value: member.toString()
            });

            if (member.roles.highest.id !== member.guild.id) {
                fields.push({
                    name: "Highest Role",
                    value: member.roles.highest.toString()
                });
            }
        }

        embed.setColor(member?.user!.hexAccentColor ? member?.user!.hexAccentColor! : '#007bff');

        const badges = getUserBadges(user).join('\n');

        fields.push({
            name: "Badges",
            value: badges.trim() === '' ? '*No badges found*' : badges
        });

        if (member) {
            try {
                const muteCount = await Punishment.countDocuments({
                    guild_id: message.guildId!,
                    type: {
                        $in: [PunishmentType.MUTE, PunishmentType.HARDMUTE, PunishmentType.TIMEOUT]
                    },
                    user_id: user.id,
                });

                const warnCount = await Punishment.countDocuments({
                    guild_id: message.guildId!,
                    type: {
                        $in: [PunishmentType.WARNING]
                    },
                    user_id: user.id,
                });

                const banCount = await Punishment.countDocuments({
                    guild_id: message.guildId!,
                    type: {
                        $in: [PunishmentType.KICK, PunishmentType.SOFTBAN, PunishmentType.TEMPBAN, PunishmentType.BAN]
                    },
                    user_id: user.id,
                });

                const points = (warnCount * 3) + (muteCount * 5) + (banCount * 10);
    
                let suggestedAction = '*None*';
    
                if (points >= 1 && points < 5) {
                    suggestedAction = 'Verbal Warning';
                }
                else if (points >= 5 && points < 10) {
                    const muteMS = Date.now() + (60_000 * 30 * (points - 4));
                    suggestedAction = `Mute ${member?.roles.cache.has(client.config.props[message.guildId!].mute_role) ? '(Already muted)' : `for ${formatDistanceStrict(new Date(), new Date(muteMS))}`}`;
                }
                else if (points >= 10 && points < 15) {
                    const banMS = Date.now() + (60_000 * 60 * 24 * (points - 9));
                    suggestedAction = `Temporary ban for ${formatDistanceStrict(new Date(), new Date(banMS))} or Kick`;
                }
                else if (points >= 15) {
                    suggestedAction = "Permanent Ban";
                }
    
                fields.push({
                    name: 'Moderation Points',
                    value: points + ''
                });
                
                fields.push({
                    name: 'Suggested Action',
                    value: suggestedAction
                });
            }
            catch (e) {
                console.log(e);
            }
        }

        fields = [...fields, ...fieldsCommon];
        embed.setFields(fields);
        embed.setTimestamp();
        
        await message.reply({
            embeds: [
                embed
            ]
        });
    } 
}
