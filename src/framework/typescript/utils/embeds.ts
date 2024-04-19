import type { User } from "discord.js";

export function userInfo(user: User) {
    return `ID: ${user.id}\nUsername: ${user.username}\nMention: <@${user.id}>`;
}
