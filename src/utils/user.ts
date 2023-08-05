import { User, UserFlags } from "discord.js";

export const getUserBadges = (user: User) => {
    const badges = [];

    if (user.flags?.has(UserFlags.BugHunterLevel1)) badges.push("Bughunter Level 1");
    if (user.flags?.has(UserFlags.BugHunterLevel2)) badges.push("Bughunter Level 2");
    if (user.flags?.has(UserFlags.CertifiedModerator)) badges.push("Discord Certified Moderator");
    if (user.flags?.has(UserFlags.Staff)) badges.push("Discord Staff");
    if (user.flags?.has(UserFlags.PremiumEarlySupporter)) badges.push("Early Nitro Supporter");
    if (user.flags?.has(UserFlags.VerifiedDeveloper)) badges.push("Early Verified Bot Developer");
    if (user.flags?.has(UserFlags.HypeSquadOnlineHouse3)) badges.push("HypeSquad Balance");
    if (user.flags?.has(UserFlags.HypeSquadOnlineHouse2)) badges.push("HypeSquad Brilliance");
    if (user.flags?.has(UserFlags.HypeSquadOnlineHouse1)) badges.push("HypeSquad Bravery");
    if (user.flags?.has(UserFlags.Hypesquad)) badges.push("HypeSquad Events");
    if (user.flags?.has(UserFlags.Partner)) badges.push("Partnered Server Owner");
    if (user.flags?.has(UserFlags.BotHTTPInteractions)) badges.push("Supports Interactions");
    if (user.flags?.has(UserFlags.VerifiedBot)) badges.push("Verified Bot");
    if (user.flags?.has(UserFlags.ActiveDeveloper)) badges.push("Active Developer");

    return badges.map(b => `🔵 ${b}`);
};
