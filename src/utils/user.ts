import { User, UserFlags } from "discord.js";
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

    return badges;
};
