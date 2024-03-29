/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { GuildMember, TimestampStyles, User, UserFlags, time } from "discord.js";
import Client from "../core/Client";
import { getEmoji } from "./utils";

const map: Record<string, [string, string]> = {
    BugHunterLevel1: ["bughunter", "Bughunter Level 1"],
    BugHunterLevel2: ["golden_bughunter", "Bughunter Level 2"],
    CertifiedModerator: ["certified_mod", "Discord Certified Moderator"],
    Staff: ["discord_staff", "Discord Staff"],
    PremiumEarlySupporter: ["early_supporter", "Early Nitro Supporter"],
    VerifiedDeveloper: ["verified_bot_developer", "Early Verified Bot Developer"],
    HypeSquadOnlineHouse1: ["bravery", "HypeSquad Bravery"],
    HypeSquadOnlineHouse2: ["brilliance", "HypeSquad Brilliance"],
    HypeSquadOnlineHouse3: ["balance", "HypeSquad Balance"],
    Hypesquad: ["hypesquad_events", "HypeSquad Events"],
    Partner: ["partnered_server_owner", "Partnered Server Owner"],
    VerifiedBot: ["verified_bot", "Verified Bot"],
    BotHTTPInteractions: ["supports_interactions", "Supports Interactions"],
    ActiveDeveloper: ["active_developer", "Active Developer"]
};

export const getUserBadges = (client: Client, user: User) => {
    const badges = [];

    for (const flagString in map) {
        const [emojiName, badgeTitle] = map[flagString];
        const flag = UserFlags[flagString as keyof typeof UserFlags];

        if (flag && user.flags?.has(flag)) {
            const emoji = getEmoji(client, emojiName);
            badges.push(`${emoji.toString()} ${badgeTitle}`);
        }
    }

    if (user.discriminator === "0") {
        badges.push(`${getEmoji(client, "new_username")} Has opted-in to the new username system`);
    }

    return badges;
};

export const getMemberBadges = (client: Client, member: GuildMember) => {
    const badges = getUserBadges(client, member.user);

    if (
        member.premiumSinceTimestamp ||
        client.guilds.cache.some(guild => !!guild.members.cache.get(member.id)?.premiumSinceTimestamp)
    ) {
        badges.push(`${getEmoji(client, "nitro")} Nitro Subscriber`);
    }

    let minPremiumSince = member.premiumSince;

    for (const guild of client.guilds.cache.values()) {
        const guildMember = guild.members.cache.get(member.id);

        if (
            guildMember &&
            guildMember.premiumSince &&
            (minPremiumSince?.getTime() ?? 0) > (guildMember.premiumSince?.getTime() ?? 0)
        ) {
            minPremiumSince = guildMember.premiumSince;
        }
    }

    if (minPremiumSince) {
        badges.push(`${getEmoji(client, "boost")} Server boosting since ${time(minPremiumSince, TimestampStyles.LongDate)}`);
    }

    return badges;
};
