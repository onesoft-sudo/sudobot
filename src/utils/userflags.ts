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

import { User, UserFlags } from "discord.js";

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

export const flagsToString = (flags: Exclude<User["flags"], null>) => {
    const strings = [];

    for (const [flag, description] of flagmap.entries()) {
        if (flags.has(flag as Parameters<typeof flags.has>[0])) {
            strings.push(description);
        }
    }

    return strings;
};
