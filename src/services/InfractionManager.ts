import { Infraction, InfractionType } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import { APIEmbed, Colors, Snowflake, User } from "discord.js";
import CommandAbortedError from "../framework/commands/CommandAbortedError";
import { Service } from "../framework/services/Service";
import { emoji } from "../utils/emoji";
import ConfigurationManager from "./ConfigurationManager";

class InfractionManager extends Service {
    private readonly actionDoneNames: Record<InfractionType, string> = {
        [InfractionType.BEAN]: "beaned",
        [InfractionType.MASSKICK]: "kicked",
        [InfractionType.KICK]: "kicked",
        [InfractionType.MUTE]: "muted",
        [InfractionType.SOFTBAN]: "softbanned",
        [InfractionType.WARNING]: "warned",
        [InfractionType.MASSBAN]: "banned",
        [InfractionType.BAN]: "banned",
        [InfractionType.UNBAN]: "unbanned",
        [InfractionType.UNMUTE]: "unmuted",
        [InfractionType.BULK_DELETE_MESSAGE]: "bulk deleted messages",
        [InfractionType.TEMPBAN]: "temporarily banned",
        [InfractionType.NOTE]: "noted",
        [InfractionType.TIMEOUT]: "timed out",
        [InfractionType.TIMEOUT_REMOVE]: "removed timeout"
    };

    public processReason(guildId: Snowflake, reason: string | undefined, abortOnNotFound = true) {
        if (!reason?.length) {
            return null;
        }

        let finalReason = reason;
        const configManager = this.client.getService(ConfigurationManager);
        const templates = configManager.config[guildId]?.infractions?.reason_templates ?? {};
        const templateWrapper =
            configManager.config[guildId]?.infractions?.reason_template_placeholder_wrapper ??
            "{{%name%}}";

        for (const key in templates) {
            const placeholder = templateWrapper.replace("%name%", `( *)${key}( *)`);
            finalReason = finalReason.replace(new RegExp(placeholder, "gi"), templates[key]);
        }

        if (abortOnNotFound) {
            const matches = [...finalReason.matchAll(/\{\{[A-Za-z0-9_-]+\}\}/gi)];

            if (matches.length > 0) {
                const abortReason = `${emoji(
                    this.client,
                    "error"
                )} The following placeholders were not found in the reason: \`${matches
                    .map(m => m[0])
                    .join("`, `")}\`
                        `;

                throw new CommandAbortedError(abortReason);
            }
        }

        return finalReason;
    }

    private async notify(user: User, infraction: Infraction) {
        const guild = this.client.guilds.cache.get(infraction.guildId);

        if (!guild) {
            return false;
        }

        const embed = {
            author: {
                name: `You've been ${this.actionDoneNames[infraction.type]} in ${guild.name}`,
                icon_url: guild.iconURL() ?? undefined
            },
            fields: [
                {
                    name: "Reason",
                    value: infraction.reason ?? "No reason provided"
                }
            ],
            color: Colors.Red,
            timestamp: new Date().toISOString()
        } satisfies APIEmbed;

        if (infraction.expiresAt) {
            embed.fields.push({
                name: "Duration",
                value: formatDistanceToNowStrict(infraction.expiresAt)
            });
        }

        try {
            await user.send({ embeds: [embed] });
            return true;
        } catch {
            return false;
        }
    }

    public async createBean({ moderator, user, reason, guildId }: CreateBeanPayload) {
        const infraction = await this.client.prisma.infraction.create({
            data: {
                userId: user.id,
                guildId,
                moderatorId: moderator.id,
                type: InfractionType.BEAN,
                reason: this.processReason(guildId, reason)
            }
        });

        await this.notify(user, infraction);
        this.client.emit("infractionCreate", infraction, user, moderator, false);
        return { infraction };
    }
}

type CommonOptions = {
    moderator: User;
    reason?: string;
    guildId: Snowflake;
};

type CreateBeanPayload = CommonOptions & {
    user: User;
};

export default InfractionManager;
