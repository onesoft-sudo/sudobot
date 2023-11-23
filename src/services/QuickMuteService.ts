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

import { ChannelType, GuildMember, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { log, logError, logInfo, logWarn } from "../utils/logger";

export const name = "quickmute";

export default class QuickMuteService extends Service implements HasEventListeners {
    @GatewayEventListener("messageReactionAdd")
    async onMessageReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        if (!reaction || !reaction.message.guild || reaction.message.channel.type === ChannelType.DM) {
            return;
        }

        const result = await this.handle(reaction, user);

        if (result === false) {
            await reaction.remove().catch(logError);
        }
    }

    async handle(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        log("Reaction");

        const config = this.client.configManager.config[reaction.message.guildId!]?.quickmute;

        log(config);

        if (!config?.enabled || !config?.clear_emoji || !config?.noclear_emoji) {
            return;
        }

        log("Reaction 2");

        if (
            reaction.emoji.id !== config.clear_emoji &&
            reaction.emoji.identifier !== config.clear_emoji &&
            reaction.emoji.id !== config.noclear_emoji &&
            reaction.emoji.identifier !== config.noclear_emoji
        ) {
            return;
        }

        logInfo("Quickmute trigger reaction receieved.");

        const clearMessages = reaction.emoji.id === config.clear_emoji || reaction.emoji.identifier === config.clear_emoji;
        const guild = this.client.guilds.cache.get(reaction.message.guildId!);

        if (!guild) {
            logWarn("Could not resolve guild");
            return;
        }

        if (reaction.message.author!.id === this.client.user!.id) {
            log("Cannot mute the bot itself");
            return false;
        }

        let moderator: GuildMember | undefined = undefined;

        try {
            moderator = guild.members.cache.get(user.id) ?? (await guild.members.fetch(user.id));
        } catch (e) {
            logError(e);
            return;
        }

        if (!moderator) {
            return;
        }

        const { permissions } = await this.client.permissionManager.getMemberPermissions(moderator, true);

        if (!permissions.has("Administrator") && !permissions.has("ManageMessages") && !permissions.has("ModerateMembers")) {
            logInfo("This moderator does not have permission to use quickmute!");
            return false;
        }

        const member = reaction.message.member!;

        if (!this.client.permissionManager.shouldModerate(member, moderator)) {
            logInfo("This moderator does not have permission to mute this user!");
            return false;
        }

        await this.client.infractionManager.createMemberMute(member, {
            guild,
            moderator: user as User,
            autoRemoveQueue: true,
            bulkDeleteReason: clearMessages
                ? "Clearing recent messages from user, because the quickmute trigger was used."
                : undefined,
            duration: config.duration ?? 1000 * 60 * 60 * 2,
            messageChannel: clearMessages ? (reaction.message.channel! as TextChannel) : undefined,
            notifyUser: true,
            sendLog: true,
            reason:
                config.reason ??
                "You have violated the rules or guidelines of the server. Please take a break, and come back later."
        });

        if (!clearMessages) {
            await reaction.remove().catch(logError);
        }

        return true;
    }
}
