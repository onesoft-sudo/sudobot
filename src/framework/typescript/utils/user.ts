/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { application, client } from "@framework/utils/helpers";
import type { GuildMember, User } from "discord.js";
import { time, TimestampStyles, UserFlags } from "discord.js";
import { emoji, findEmoji } from "./emoji";

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

export const getUserBadges = (user: User) => {
    const badges = [];

    for (const flagString in map) {
        const [emojiName, badgeTitle] = map[flagString];
        const flag = UserFlags[flagString as keyof typeof UserFlags];

        if (flag && user.flags?.has(flag)) {
            const guildEmoji = findEmoji(application(), emojiName);
            badges.push(`${guildEmoji ?? ""} ${badgeTitle}`.trim());
        }
    }

    if (user.discriminator === "0") {
        badges.push(`${emoji(application(), "new_username")} Has opted-in to the new username system`.trim());
    }

    return badges;
};

export const getMemberBadges = (member: GuildMember) => {
    const badges = getUserBadges(member.user);

    if (
        member.premiumSinceTimestamp ||
        client().guilds.cache.some(guild => !!guild.members.cache.get(member.id)?.premiumSinceTimestamp)
    ) {
        badges.push(`${emoji(application(), "nitro")} Nitro Subscriber`.trim());
    }

    let minPremiumSince = member.premiumSince;

    for (const guild of client().guilds.cache.values()) {
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
        badges.push(
            `${emoji(application(), "boost")} Server boosting since ${time(minPremiumSince, TimestampStyles.LongDate)}`.trim()
        );
    }

    return badges;
};

const flagmap = new Map<UserFlags, string>([
    [UserFlags.ActiveDeveloper, "User is an active developer"],
    [UserFlags.BotHTTPInteractions, "Uses application commands"],
    [UserFlags.BugHunterLevel1, "Bug hunter: Level 1"],
    [UserFlags.BugHunterLevel2, "Bug hunter: Level 2"],
    [UserFlags.CertifiedModerator, "Discord Certified Moderator"],
    [UserFlags.Collaborator, "User is a collaborator and has staff permissions"],
    [UserFlags.DisablePremium, "Nitro features are forcefully turned off for this account"],
    [UserFlags.HasUnreadUrgentMessages, "This user has unread urgent messages from Discord"],
    [UserFlags.HypeSquadOnlineHouse1, "Hypesquad Bravery"],
    [UserFlags.HypeSquadOnlineHouse2, "Hypesquad Brilliance"],
    [UserFlags.HypeSquadOnlineHouse3, "Hypesquad Balance"],
    [UserFlags.Hypesquad, "This user is a Hypesquad Events member"],
    [UserFlags.MFASMS, "This user has SMS-verification enabled"],
    [UserFlags.Partner, "This user owns a Discord-partnered server"],
    [UserFlags.PremiumEarlySupporter, "This user is a early supporter"],
    [UserFlags.PremiumPromoDismissed, "PremiumPromoDismissed (This flag is not exactly known yet)"],
    [UserFlags.Quarantined, "This account has been quarantined due to recent activity (Limited access)"],
    [UserFlags.RestrictedCollaborator, "User is a restricted collaborator and has staff permissions."],
    [UserFlags.Spammer, "This user has been flagged as a spammer"],
    [UserFlags.Staff, "This user is a Discord Employee"],
    [UserFlags.TeamPseudoUser, "This account is a Team account."],
    [UserFlags.VerifiedBot, "This bot is verified"],
    [UserFlags.VerifiedDeveloper, "This user is a verified bot developer"]
]);

export const userFlagsToString = (flags: Exclude<User["flags"], null>) => {
    const strings = [];

    for (const [flag, description] of flagmap.entries()) {
        if (flags.has(flag as Parameters<typeof flags.has>[0])) {
            strings.push(description);
        }
    }

    return strings;
};
