import APIErrors from "@framework/errors/APIErrors";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { isDiscordAPIError } from "@framework/utils/errors";
import { GuildBasedChannel, PermissionsString, ThreadChannel } from "discord.js";

@Name("channelLockManager")
class ChannelLockManager extends Service {
    private filter(permission: string) {
        return [
            "SendMessages",
            "SendTTSMessages",
            "SendVoiceMessages",
            "SendMessagesInThreads",
            "AddReactions",
            "Speak",
            "Connect",
            "UseApplicationCommands"
        ].includes(permission);
    }

    public async lock(channel: Exclude<GuildBasedChannel, ThreadChannel>) {
        if (!channel.manageable) {
            return {
                status: "error" as const,
                type: "not_managable" as const,
                message: "The system cannot manage this channel"
            };
        }

        const channelLock = await this.application.prisma.channelLock.findFirst({
            where: {
                channelId: channel.id,
                guildId: channel.guild.id
            }
        });

        if (channelLock) {
            return {
                status: "error" as const,
                type: "channel_already_locked" as const,
                message: "This channel is already locked"
            };
        }

        const overwrite = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);

        await this.application.prisma.channelLock.create({
            data: {
                permissions: {
                    allow: overwrite?.allow.toArray().filter(this.filter) ?? [],
                    deny: overwrite?.deny.toArray().filter(this.filter) ?? []
                },
                channelId: channel.id,
                guildId: channel.guild.id
            }
        });

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: false,
                SendTTSMessages: false,
                SendVoiceMessages: false,
                SendMessagesInThreads: false,
                AddReactions: false,
                Speak: false,
                Connect: false,
                UseApplicationCommands: false
            });
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                return {
                    status: "error" as const,
                    type: "api_error" as const,
                    code: error.code,
                    message: APIErrors.translateToMessage(+error.code)
                };
            }

            return {
                status: "error" as const,
                type: "unknown" as const,
                message: "An unknown error has occurred"
            };
        }

        return { status: "success" as const };
    }

    private overwritePermissions(overwrite: unknown, permission: PermissionsString) {
        if (!overwrite) {
            return false;
        }

        const castedOverwrite = overwrite as {
            allow: Readonly<Array<PermissionsString>>;
            deny: Readonly<Array<PermissionsString>>;
        };

        if (castedOverwrite.allow.includes(permission)) {
            return true;
        }

        if (castedOverwrite.deny.includes(permission)) {
            return false;
        }

        return null;
    }

    public async unlock(channel: Exclude<GuildBasedChannel, ThreadChannel>) {
        if (!channel.manageable) {
            return {
                status: "error" as const,
                type: "not_managable" as const,
                message: "The system cannot manage this channel"
            };
        }

        const channelLock = await this.application.prisma.channelLock.findFirst({
            where: {
                channelId: channel.id,
                guildId: channel.guild.id
            }
        });

        if (!channelLock) {
            return {
                status: "error" as const,
                type: "channel_not_locked" as const,
                message: "This channel is not locked"
            };
        }

        await this.application.prisma.channelLock.delete({
            where: {
                id: channelLock.id
            }
        });

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: this.overwritePermissions(channelLock.permissions, "SendMessages"),
                SendTTSMessages: this.overwritePermissions(
                    channelLock.permissions,
                    "SendTTSMessages"
                ),
                SendVoiceMessages: this.overwritePermissions(
                    channelLock.permissions,
                    "SendVoiceMessages"
                ),
                SendMessagesInThreads: this.overwritePermissions(
                    channelLock.permissions,
                    "SendMessagesInThreads"
                ),
                AddReactions: this.overwritePermissions(channelLock.permissions, "AddReactions"),
                Speak: this.overwritePermissions(channelLock.permissions, "Speak"),
                Connect: this.overwritePermissions(channelLock.permissions, "Connect"),
                UseApplicationCommands: this.overwritePermissions(
                    channelLock.permissions,
                    "UseApplicationCommands"
                )
            });
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                return {
                    status: "error" as const,
                    type: "api_error" as const,
                    code: error.code,
                    message: APIErrors.translateToMessage(+error.code)
                };
            }

            return {
                status: "error" as const,
                type: "unknown" as const,
                message: "An unknown error has occurred"
            };
        }

        return { status: "success" as const };
    }
}

export default ChannelLockManager;
