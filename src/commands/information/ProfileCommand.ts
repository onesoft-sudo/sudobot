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
    Emoji,
    Guild,
    GuildMember,
    PermissionFlagsBits,
    SlashCommandBuilder,
    roleMention
} from "discord.js";
import Client from "../../core/Client";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { log, logError } from "../../utils/logger";
import { getUserBadges } from "../../utils/user";
import { getEmoji } from "../../utils/utils";

const status = (s: "idle" | "online" | "dnd" | "invisible" | null | undefined): string => {
    if (s === "idle") return "Idle";
    else if (s === "dnd") return "Do not disturb";
    else if (s === "online") return "Online";
    else if (s === undefined || s === null || s === "invisible") return "Offline/Invisible";

    return s;
};

const statusEmoji = (client: Client, s: "idle" | "online" | "dnd" | "invisible" | null | undefined): string => {
    if (s === "idle") return getEmoji(client, "idle");
    else if (s === "dnd") return getEmoji(client, "dnd");
    else if (s === "online") return getEmoji(client, "online");
    else if (s === undefined || s === null || s === "invisible") return getEmoji(client, "invisible");

    return s;
};

const getStatusText = (client: Client, member: GuildMember) =>
    "" +
    ((member?.presence?.clientStatus?.desktop
        ? statusEmoji(client, member?.presence?.clientStatus?.desktop) +
          " Desktop (" +
          status(member?.presence?.clientStatus?.desktop) +
          ")\n"
        : "") +
        (member?.presence?.clientStatus?.web
            ? statusEmoji(client, member?.presence?.clientStatus?.web) +
              " Web (" +
              status(member?.presence?.clientStatus?.web) +
              ")\n"
            : "") +
        (member?.presence?.clientStatus?.mobile
            ? statusEmoji(client, member?.presence?.clientStatus?.mobile) +
              " Mobile (" +
              status(member?.presence?.clientStatus?.mobile) +
              ")"
            : ""));

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

    const percentage = Math.round((array.length / allBits) * 100);
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
    public readonly aliases = ["userprofile", "userinfo"];
    public readonly permissions = [];

    public readonly description = "Shows your or someone else's profile.";
    public readonly slashCommandBuilder = new SlashCommandBuilder().addUserOption(option =>
        option.setName("member").setDescription("The target member")
    );

    private isAvailableEmoji({ id, identifier }: Emoji) {
        for (const [, guild] of this.client.guilds.cache) {
            const emoji = guild.emojis.cache.find(e => e.id === id || e.identifier === identifier);

            if (emoji) {
                return true;
            }
        }

        return false;
    }

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
                    activities.push(
                        `${a.emoji && this.isAvailableEmoji(a.emoji) ? `${a.emoji.toString()}` : ":small_blue_diamond:"} ${
                            a.state
                        }`
                    );
                } else if (a.type === ActivityType.Listening) {
                    if (a.name === "Spotify") {
                        const url = a.url ? `${a.url}` : null;
                        activities.push(
                            `${this.emoji("spotify")} Listening to **Spotify**: ${url ? "[" : "__"}${a.state?.split(/\;/)[0]} - ${
                                a.details
                            }${url ? "](" + url + ")" : "__"}`
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
        const statusText = getStatusText(this.client, member!);

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
                value: `${statusText === "" ? `${this.emoji("invisible")} Offline/Invisible` : statusText}`
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

        const badges = getUserBadges(this.client, member!.user);

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
            permissionPercentage = this.client.permissionManager.getMemberPermissionLevel(member).level;
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
