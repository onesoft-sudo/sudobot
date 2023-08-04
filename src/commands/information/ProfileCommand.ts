/**
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

import { formatDistanceToNowStrict } from "date-fns";
import {
    APIEmbedField,
    ActivityType,
    EmbedBuilder,
    Guild,
    GuildMember,
    PermissionFlagsBits,
    SlashCommandBuilder,
    User,
    UserFlags,
    roleMention
} from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { log, logError } from "../../utils/logger";

const getUserBadges = (user: User) => {
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

const status = (s: "idle" | "online" | "dnd" | "invisible" | null | undefined): string => {
    if (s === "idle") return "Idle";
    else if (s === "dnd") return "Do not disturb";
    else if (s === "online") return "Online";
    else if (s === undefined || s === null || s === "invisible") return "Offline/Invisible";

    return s;
};

const getStatusText = (member: GuildMember) =>
    "" +
    ((member?.presence?.clientStatus?.desktop ? "Desktop (" + status(member?.presence?.clientStatus?.desktop) + ")\n" : "") +
        (member?.presence?.clientStatus?.web ? "Web (" + status(member?.presence?.clientStatus?.web) + ")\n" : "") +
        (member?.presence?.clientStatus?.mobile ? "Mobile (" + status(member?.presence?.clientStatus?.mobile) + ")" : ""));

export function getPermissionLevel(
    { permissions, guild, id }: { id: string; permissions: GuildMember["permissions"]; guild: Guild },
    string: boolean = false
) {
    if (guild.ownerId === id) {
        return string ? "100" : 100;
    }

    const allBits = Object.keys(PermissionFlagsBits).length;
    const array = permissions.toArray();

    if (array.includes("Administrator")) {
        return string ? "100" : 100;
    }

    const percentage = (array.length / allBits) * 100;
    return string ? percentage.toString() : percentage;
}

export default class ProfileCommand extends Command {
    public readonly name = "profile";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.GuildMember],
            name: "member",
            optional: true,
            typeErrorMessage: "Invalid member given",
            entityNotNull: true,
            entityNotNullErrorMessage: "That member could not be found!"
        }
    ];
    public readonly aliases = ["userprofile"];
    public readonly permissions = [];

    public readonly description = "Shows your or someone else's profile.";
    public readonly slashCommandBuilder = new SlashCommandBuilder().addUserOption(option =>
        option.setName("member").setDescription("The target member")
    );

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const member: GuildMember | null =
            (context.isLegacy ? context.parsedNamedArgs.member : context.options.getMember("member")) ?? message.member;

        if (!member) {
            await this.error(message, "Could not resolve that member!");
            return;
        }

        const activities: string[] = [];

        log(member.presence);

        if (member?.presence) {
            for (const a of member?.presence?.activities.values()!) {
                log(a);

                if (a.type === ActivityType.Custom) {
                    activities.push(`${a.emoji ? `${a.emoji.toString()} ` : ""}${a.state}`);
                } else if (a.type === ActivityType.Listening) {
                    if (a.name === "Spotify") {
                        const url = a.url ? `https://open.spotify.com/track/${a.url}` : null;
                        activities.push(
                            `:notes: Listening to **Spotify**: ${url ? "[" : "**"}${a.state?.replace(/\;/, ",")} - ${a.details}${
                                url ? "](" + url + ")" : "**"
                            }`
                        );
                        continue;
                    }

                    activities.push(`:musical_note: Listening to **${a.name}**`);
                } else if (a.type === ActivityType.Competing) {
                    activities.push(`:fire: Competing **${a.name}**`);
                } else if (a.type === ActivityType.Playing) {
                    activities.push(`:video_game: Playing **${a.name}**`);
                } else if (a.type === ActivityType.Streaming) {
                    activities.push(`:video_camera: Streaming **${a.name}**`);
                } else if (a.type === ActivityType.Watching) {
                    activities.push(`:tv: Watching **${a.name}**`);
                }
            }
        }

        const allRoles = [...member!.roles.cache.values()]
            .filter(role => role.id !== message.guildId!)
            .sort((role1, role2) => {
                return role2.position - role1.position;
            });
        const limit = 10;
        const roles = (allRoles.length > limit ? allRoles.slice(0, limit) : allRoles)
            .reduce((acc, value) => `${acc} ${roleMention(value.id)}`, "")!
            .trim()!;
        const statusText = getStatusText(member!);

        const fields: APIEmbedField[] = [
            {
                name: "Nickname",
                value: `${member!.nickname?.replace(/\*\<\>\@\_\~\|/g, "") ?? "*Nickname not set*"}`
            },
            {
                name: "Account Created",
                value: `${member!.user.createdAt.toLocaleDateString("en-US")} (${formatDistanceToNowStrict(
                    member!.user.createdTimestamp,
                    { addSuffix: true }
                )})`,
                inline: true
            },
            {
                name: "Joined at",
                value: `${member!.joinedAt!.toLocaleDateString("en-US")} (${formatDistanceToNowStrict(member!.joinedTimestamp!, {
                    addSuffix: true
                })})`,
                inline: true
            },
            {
                name: "Active Devices",
                value: `${statusText === "" ? "Offline/Invisible" : statusText}`
            },
            {
                name: "Status",
                value: `${activities.length === 0 ? "*No status set*" : activities.join("\n")}`
            },
            {
                name: "Roles",
                value:
                    roles === ""
                        ? "*No roles assigned*"
                        : `${roles} ${allRoles.length > limit ? `**+ ${allRoles.length - limit} More**` : ""}`
            }
        ];

        const badges = getUserBadges(member!.user);

        if (badges.length > 0) {
            fields.push({
                name: "Badges",
                value: badges.join("\n")
            });
        }

        let banner: string | undefined;

        try {
            await member?.user.fetch(true);
            banner = member!.user!.bannerURL({ size: 4096, forceStatic: false }) ?? undefined;
        } catch (e) {
            logError(e);
        }

        log("Banner", banner, member!.user!.banner);

        let permissionPercentage = 0;

        if (this.client.configManager.config[message.guildId!]?.permissions.mode === "levels") {
            permissionPercentage = this.client.permissionManager.getMemberPermissionLevel(member);
        } else {
            permissionPercentage = getPermissionLevel(member, false) as number;
        }

        await this.deferredReply(message, {
            embeds: [
                new EmbedBuilder({
                    image: banner
                        ? {
                              url: banner
                          }
                        : undefined
                })
                    .setColor(member!.user!.hexAccentColor ? member!.user!.hexAccentColor! : "#007bff")
                    .setAuthor({
                        name: member?.user.tag!,
                        iconURL: member!.user.displayAvatarURL()
                    })
                    .setThumbnail(
                        member!.displayAvatarURL({
                            size: 4096,
                            forceStatic: false
                        })
                    )
                    .setFields(fields)
                    .setFooter({
                        text: `${member?.user.bot ? "Bot" : "User"} • ${member!.id} • Has ${permissionPercentage}% permissions`
                    })
            ]
        });
    }
}
